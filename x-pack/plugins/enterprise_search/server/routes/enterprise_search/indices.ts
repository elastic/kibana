/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestPutPipelineRequest,
  IngestSimulateRequest,
} from '@elastic/elasticsearch/lib/api/types';

import { schema } from '@kbn/config-schema';

import { i18n } from '@kbn/i18n';

import { DEFAULT_PIPELINE_NAME } from '../../../common/constants';
import { ErrorCode } from '../../../common/types/error_codes';
import { deleteConnectorById } from '../../lib/connectors/delete_connector';

import { fetchConnectorByIndexName, fetchConnectors } from '../../lib/connectors/fetch_connectors';
import { fetchCrawlerByIndexName, fetchCrawlers } from '../../lib/crawler/fetch_crawlers';

import { createIndex } from '../../lib/indices/create_index';
import { deleteMlInferencePipeline } from '../../lib/indices/delete_ml_inference_pipeline';
import { indexOrAliasExists } from '../../lib/indices/exists_index';
import { fetchIndex } from '../../lib/indices/fetch_index';
import { fetchIndices } from '../../lib/indices/fetch_indices';
import { fetchMlInferencePipelineHistory } from '../../lib/indices/fetch_ml_inference_pipeline_history';
import { fetchMlInferencePipelineProcessors } from '../../lib/indices/fetch_ml_inference_pipeline_processors';
import { generateApiKey } from '../../lib/indices/generate_api_key';
import { getMlInferenceErrors } from '../../lib/ml_inference_pipeline/get_inference_errors';
import { createIndexPipelineDefinitions } from '../../lib/pipelines/create_pipeline_definitions';
import { getCustomPipelines } from '../../lib/pipelines/get_custom_pipelines';
import { getPipeline } from '../../lib/pipelines/get_pipeline';
import { RouteDependencies } from '../../plugin';
import { createError } from '../../utils/create_error';
import {
  createAndReferenceMlInferencePipeline,
  CreatedPipeline,
} from '../../utils/create_ml_inference_pipeline';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import {
  isIndexNotFoundException,
  isResourceNotFoundException,
} from '../../utils/identify_exceptions';
import { getPrefixedInferencePipelineProcessorName } from '../../utils/ml_inference_pipeline_utils';

export function registerIndexRoutes({
  router,
  enterpriseSearchRequestHandler,
  log,
}: RouteDependencies) {
  router.get(
    { path: '/internal/enterprise_search/search_indices', validate: false },
    elasticsearchErrorHandler(log, async (context, _, response) => {
      const { client } = (await context.core).elasticsearch;
      const indices = await fetchIndices(client, '*', false, true, 'search-');

      return response.ok({
        body: indices,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        query: schema.object({
          page: schema.number({ defaultValue: 0, min: 0 }),
          return_hidden_indices: schema.maybe(schema.boolean()),
          search_query: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 0 }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const {
        page,
        size,
        return_hidden_indices: returnHiddenIndices,
        search_query: searchQuery,
      } = request.query;
      const { client } = (await context.core).elasticsearch;

      const indexPattern = searchQuery ? `*${searchQuery}*` : '*';
      const totalIndices = await fetchIndices(client, indexPattern, !!returnHiddenIndices, false);
      const totalResults = totalIndices.length;
      const totalPages = Math.ceil(totalResults / size) || 1;
      const startIndex = (page - 1) * size;
      const endIndex = page * size;
      const selectedIndices = totalIndices.slice(startIndex, endIndex);
      const indexNames = selectedIndices.map(({ name }) => name);
      const connectors = await fetchConnectors(client, indexNames);
      const crawlers = await fetchCrawlers(client, indexNames);
      const indices = selectedIndices.map((index) => ({
        ...index,
        connector: connectors.find((connector) => connector.index_name === index.name),
        crawler: crawlers.find((crawler) => crawler.index_name === index.name),
      }));

      return response.ok({
        body: {
          indices,
          meta: {
            page: {
              current: page,
              size: indices.length,
              total_pages: totalPages,
              total_results: totalResults,
            },
          },
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      try {
        const index = await fetchIndex(client, indexName);
        return response.ok({
          body: index,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }

        throw error;
      }
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      try {
        const crawler = await fetchCrawlerByIndexName(client, indexName);
        const connector = await fetchConnectorByIndexName(client, indexName);

        if (crawler) {
          const crawlerRes = await enterpriseSearchRequestHandler.createRequest({
            path: `/api/ent/v1/internal/indices/${indexName}`,
          })(context, request, response);

          if (crawlerRes.status !== 200) {
            throw new Error(crawlerRes.payload.message);
          }
        }

        if (connector) {
          await deleteConnectorById(client, connector.id);
        }

        await client.asCurrentUser.indices.delete({ index: indexName });

        return response.ok({
          body: {},
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isIndexNotFoundException(error)) {
          return createError({
            errorCode: ErrorCode.INDEX_NOT_FOUND,
            message: 'Could not find index',
            response,
            statusCode: 404,
          });
        }

        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/exists',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      let indexExists: boolean;

      try {
        indexExists = await client.asCurrentUser.indices.exists({ index: indexName });
      } catch (e) {
        log.warn(
          i18n.translate('xpack.enterpriseSearch.server.routes.indices.existsErrorLogMessage', {
            defaultMessage: 'An error occurred while resolving request to {requestUrl}',
            values: {
              requestUrl: request.url.toString(),
            },
          })
        );
        log.warn(e);
        indexExists = false;
      }

      return response.ok({
        body: {
          exists: indexExists,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/api_key',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const apiKey = await generateApiKey(client, indexName);

      return response.ok({
        body: apiKey,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/pipelines',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const createResult = await createIndexPipelineDefinitions(indexName, client.asCurrentUser);

      return response.ok({
        body: createResult,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/pipelines',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      const [defaultPipeline, customPipelines] = await Promise.all([
        getPipeline(DEFAULT_PIPELINE_NAME, client),
        getCustomPipelines(indexName, client),
      ]);
      return response.ok({
        body: {
          ...defaultPipeline,
          ...customPipelines,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const mlInferencePipelineProcessorConfigs = await fetchMlInferencePipelineProcessors(
        client.asCurrentUser,
        indexName
      );

      return response.ok({
        body: mlInferencePipelineProcessorConfigs,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          pipeline_name: schema.string(),
          model_id: schema.string(),
          source_field: schema.string(),
          destination_field: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },

    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      const {
        model_id: modelId,
        pipeline_name: pipelineName,
        source_field: sourceField,
        destination_field: destinationField,
      } = request.body;

      let createPipelineResult: CreatedPipeline | undefined;
      try {
        // Create the sub-pipeline for inference
        createPipelineResult = await createAndReferenceMlInferencePipeline(
          indexName,
          pipelineName,
          modelId,
          sourceField,
          destinationField,
          client.asCurrentUser
        );
      } catch (error) {
        // Handle scenario where pipeline already exists
        if ((error as Error).message === ErrorCode.PIPELINE_ALREADY_EXISTS) {
          return createError({
            errorCode: (error as Error).message as ErrorCode,
            message: `
              A pipeline with the name "${getPrefixedInferencePipelineProcessorName(pipelineName)}"
              already exists. Pipelines names are unique within a deployment. Consider adding the
              index name for uniqueness.
            `,
            response,
            statusCode: 409,
          });
        }

        throw error;
      }

      return response.ok({
        body: {
          created: createPipelineResult?.id,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices',
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.maybe(schema.nullable(schema.string())),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { ['index_name']: indexName, language } = request.body;
      const { client } = (await context.core).elasticsearch;

      const indexExists = await client.asCurrentUser.indices.exists({
        index: request.body.index_name,
      });

      if (indexExists) {
        return createError({
          errorCode: ErrorCode.INDEX_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.indexExistsError',
            {
              defaultMessage: 'This index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const crawler = await fetchCrawlerByIndexName(client, request.body.index_name);

      if (crawler) {
        return createError({
          errorCode: ErrorCode.CRAWLER_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.crawlerExistsError',
            {
              defaultMessage: 'A crawler for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const connector = await fetchConnectorByIndexName(client, request.body.index_name);

      if (connector) {
        return createError({
          errorCode: ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.createApiIndex.connectorExistsError',
            {
              defaultMessage: 'A connector for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const createIndexResponse = await createIndex(client, indexName, language, true);

      return response.ok({
        body: createIndexResponse,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/_simulate',
      validate: {
        body: schema.object({
          pipeline: schema.object({
            description: schema.maybe(schema.string()),
            processors: schema.arrayOf(schema.any()),
          }),
          docs: schema.arrayOf(schema.any()),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { pipeline, docs } = request.body;
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;
      const defaultDescription = `ML inference pipeline for index ${indexName}`;

      if (!(await indexOrAliasExists(client, indexName))) {
        return createError({
          errorCode: ErrorCode.INDEX_NOT_FOUND,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.indices.pipelines.indexMissingError',
            {
              defaultMessage: 'The index {indexName} does not exist',
              values: {
                indexName,
              },
            }
          ),
          response,
          statusCode: 404,
        });
      }

      const simulateRequest: IngestSimulateRequest = {
        docs,
        pipeline: { description: defaultDescription, ...pipeline },
      };

      const simulateResult = await client.asCurrentUser.ingest.simulate(simulateRequest);

      return response.ok({
        body: simulateResult,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/errors',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const errors = await getMlInferenceErrors(indexName, client.asCurrentUser);

      return response.ok({
        body: {
          errors,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}',
      validate: {
        body: schema.object({
          description: schema.maybe(schema.string()),
          processors: schema.arrayOf(schema.any()),
        }),
        params: schema.object({
          indexName: schema.string(),
          pipelineName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const pipelineBody = request.body;
      const indexName = decodeURIComponent(request.params.indexName);
      const pipelineName = decodeURIComponent(request.params.pipelineName);
      const { client } = (await context.core).elasticsearch;
      const pipelineId = getPrefixedInferencePipelineProcessorName(pipelineName);
      const defaultDescription = `ML inference pipeline for index ${indexName}`;

      if (!(await indexOrAliasExists(client, indexName))) {
        return createError({
          errorCode: ErrorCode.INDEX_NOT_FOUND,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.indices.pipelines.indexMissingError',
            {
              defaultMessage: 'The index {indexName} does not exist',
              values: {
                indexName,
              },
            }
          ),
          response,
          statusCode: 404,
        });
      }

      const updateRequest: IngestPutPipelineRequest = {
        _meta: {
          managed: true,
          managed_by: 'Enterprise Search',
        },
        id: pipelineId,
        description: defaultDescription,
        ...pipelineBody,
      };

      const createResult = await client.asCurrentUser.ingest.putPipeline(updateRequest);

      return response.ok({
        body: createResult,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/pipeline_processors/{pipelineName}',
      validate: {
        params: schema.object({
          indexName: schema.string(),
          pipelineName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const pipelineName = decodeURIComponent(request.params.pipelineName);
      const { client } = (await context.core).elasticsearch;

      try {
        const deleteResult = await deleteMlInferencePipeline(
          indexName,
          pipelineName,
          client.asCurrentUser
        );

        return response.ok({
          body: deleteResult,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isResourceNotFoundException(error)) {
          // return specific message if pipeline doesn't exist
          return createError({
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            message: error.meta?.body?.error?.reason,
            response,
            statusCode: 404,
          });
        }
        // otherwise, let the default handler wrap it
        throw error;
      }
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/ml_inference/history',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const indexName = decodeURIComponent(request.params.indexName);
      const { client } = (await context.core).elasticsearch;

      const history = await fetchMlInferencePipelineHistory(client.asCurrentUser, indexName);

      return response.ok({
        body: history,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
