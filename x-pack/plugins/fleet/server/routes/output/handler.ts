/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

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
  PostLogstashApiKeyResponse,
} from '../../../common';
import { outputService } from '../../services/output';
import { defaultIngestErrorHandler, FleetUnauthorizedError } from '../../errors';
import { agentPolicyService } from '../../services';
import { generateLogstashApiKey, canCreateLogstashApiKey } from '../../services/api_keys';

export const getOutputsHandler: RequestHandler = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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
    return defaultIngestErrorHandler({ error, response });
  }
};

export const getOneOuputHandler: RequestHandler<
  TypeOf<typeof GetOneOutputRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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

    return defaultIngestErrorHandler({ error, response });
  }
};

export const putOuputHandler: RequestHandler<
  TypeOf<typeof PutOutputRequestSchema.params>,
  undefined,
  TypeOf<typeof PutOutputRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  try {
    await outputService.update(soClient, request.params.outputId, request.body);
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

    return defaultIngestErrorHandler({ error, response });
  }
};

export const postOuputHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostOutputRequestSchema.body>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
  const esClient = context.core.elasticsearch.client.asInternalUser;
  try {
    const { id, ...data } = request.body;
    const output = await outputService.create(soClient, data, { id });
    if (output.is_default || output.is_default_monitoring) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    }

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultIngestErrorHandler({ error, response });
  }
};

export const deleteOutputHandler: RequestHandler<
  TypeOf<typeof DeleteOutputRequestSchema.params>
> = async (context, request, response) => {
  const soClient = context.core.savedObjects.client;
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

    return defaultIngestErrorHandler({ error, response });
  }
};

export const postLogstashApiKeyHandler: RequestHandler = async (context, request, response) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
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
    return defaultIngestErrorHandler({ error, response });
  }
};
