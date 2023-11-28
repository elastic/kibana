/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import Boom from '@hapi/boom';

import type { ValueOf } from '@elastic/eui';

import { outputType } from '../../../common/constants';

import type {
  DeleteOutputRequestSchema,
  GetOneOutputRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';
import type {
  DeleteOutputResponse,
  GetOneOutputResponse,
  GetOutputsResponse,
  Output,
  OutputType,
  PostLogstashApiKeyResponse,
} from '../../../common/types';
import { outputService } from '../../services/output';
import { defaultFleetErrorHandler, FleetUnauthorizedError } from '../../errors';
import { agentPolicyService, appContextService } from '../../services';
import { generateLogstashApiKey, canCreateLogstashApiKey } from '../../services/api_keys';

function ensureNoDuplicateSecrets(output: Partial<Output>) {
  if (output.type === outputType.Kafka && output?.password && output?.secrets?.password) {
    throw Boom.badRequest('Cannot specify both password and secrets.password');
  }
  if (output.ssl?.key && output.secrets?.ssl?.key) {
    throw Boom.badRequest('Cannot specify both ssl.key and secrets.ssl.key');
  }
}

export const getOutputsHandler: RequestHandler = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const outputs = await outputService.list(soClient);

    const body: GetOutputsResponse = {
      items: outputs.items,
      page: outputs.page,
      perPage: outputs.perPage,
      total: outputs.total,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getOneOuputHandler: RequestHandler<
  TypeOf<typeof GetOneOutputRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const output = await outputService.get(soClient, request.params.outputId);

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const putOutputHandler: RequestHandler<
  TypeOf<typeof PutOutputRequestSchema.params>,
  undefined,
  TypeOf<typeof PutOutputRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const outputUpdate = request.body;
  try {
    validateOutputServerless(outputUpdate.type);
    ensureNoDuplicateSecrets(outputUpdate);
    await outputService.update(soClient, esClient, request.params.outputId, outputUpdate);
    const output = await outputService.get(soClient, request.params.outputId);
    if (output.is_default || output.is_default_monitoring) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    } else {
      await agentPolicyService.bumpAllAgentPoliciesForOutput(soClient, esClient, output.id);
    }

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const postOutputHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostOutputRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const { id, ...newOutput } = request.body;
    validateOutputServerless(newOutput.type);
    ensureNoDuplicateSecrets(newOutput);
    const output = await outputService.create(soClient, esClient, newOutput, { id });
    if (output.is_default || output.is_default_monitoring) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    }

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

function validateOutputServerless(type?: ValueOf<OutputType>): void {
  const cloudSetup = appContextService.getCloud();
  if (cloudSetup?.isServerlessEnabled && type === outputType.RemoteElasticsearch) {
    throw Boom.badRequest('Output type remote_elasticsearch not supported in serverless');
  }
}

export const deleteOutputHandler: RequestHandler<
  TypeOf<typeof DeleteOutputRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    await outputService.delete(soClient, request.params.outputId);

    const body: DeleteOutputResponse = {
      id: request.params.outputId,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const postLogstashApiKeyHandler: RequestHandler = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  try {
    const hasCreatePrivileges = await canCreateLogstashApiKey(esClient);
    if (!hasCreatePrivileges) {
      throw new FleetUnauthorizedError('Missing permissions to create logstash API key');
    }

    const apiKey = await generateLogstashApiKey(esClient);

    const body: PostLogstashApiKeyResponse = {
      // Logstash expect the key to be formatted like this id:key
      api_key: `${apiKey.id}:${apiKey.api_key}`,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
