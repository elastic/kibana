/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  GetOneDownloadSourcesRequestSchema,
  PutDownloadSourcesRequestSchema,
  PostDownloadSourcesRequestSchema,
  DeleteDownloadSourcesRequestSchema,
} from '../../types';
import type {
  GetOneDownloadSourceResponse,
  DeleteDownloadSourceResponse,
  PutDownloadSourceResponse,
  GetDownloadSourceResponse,
} from '../../../common/types';
import { downloadSourceService } from '../../services/download_source';
import { defaultFleetErrorHandler } from '../../errors';
import { agentPolicyService } from '../../services';

export const getDownloadSourcesHandler: RequestHandler = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const downloadSources = await downloadSourceService.list(soClient);

    const body: GetDownloadSourceResponse = {
      items: downloadSources.items,
      page: downloadSources.page,
      perPage: downloadSources.perPage,
      total: downloadSources.total,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getOneDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof GetOneDownloadSourcesRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    const downloadSource = await downloadSourceService.get(soClient, request.params.sourceId);

    const body: GetOneDownloadSourceResponse = {
      item: downloadSource,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Download source ${request.params.sourceId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const putDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof PutDownloadSourcesRequestSchema.params>,
  undefined,
  TypeOf<typeof PutDownloadSourcesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    await downloadSourceService.update(soClient, request.params.sourceId, request.body);
    const downloadSource = await downloadSourceService.get(soClient, request.params.sourceId);
    if (downloadSource.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    } else {
      await agentPolicyService.bumpAllAgentPoliciesForDownloadSource(
        soClient,
        esClient,
        downloadSource.id
      );
    }

    const body: PutDownloadSourceResponse = {
      item: downloadSource,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Download source ${request.params.sourceId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};

export const postDownloadSourcesHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostDownloadSourcesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    const { id, ...data } = request.body;
    const downloadSource = await downloadSourceService.create(soClient, data, { id });
    if (downloadSource.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient);
    }

    const body: GetOneDownloadSourceResponse = {
      item: downloadSource,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const deleteDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof DeleteDownloadSourcesRequestSchema.params>
> = async (context, request, response) => {
  const soClient = (await context.core).savedObjects.client;
  try {
    await downloadSourceService.delete(soClient, request.params.sourceId);

    const body: DeleteDownloadSourceResponse = {
      id: request.params.sourceId,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Donwload source ${request.params.sourceId} not found` },
      });
    }

    return defaultFleetErrorHandler({ error, response });
  }
};
