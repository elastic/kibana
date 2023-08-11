/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../common/constants';

import { ErrorCode } from '../../../../common/types/error_codes';
import { addConnector } from '../../../lib/connectors/add_connector';
import { deleteConnectorById } from '../../../lib/connectors/delete_connector';
import { fetchConnectorByIndexName } from '../../../lib/connectors/fetch_connectors';
import { fetchCrawlerByIndexName } from '../../../lib/crawler/fetch_crawlers';
import { recreateConnectorDocument } from '../../../lib/crawler/post_connector';
import { updateHtmlExtraction } from '../../../lib/crawler/put_html_extraction';
import { deleteIndex } from '../../../lib/indices/delete_index';
import { RouteDependencies } from '../../../plugin';
import { createError } from '../../../utils/create_error';
import { elasticsearchErrorHandler } from '../../../utils/elasticsearch_error_handler';

import { registerCrawlerCrawlRulesRoutes } from './crawler_crawl_rules';
import { registerCrawlerEntryPointRoutes } from './crawler_entry_points';
import { registerCrawlerMultipleSchedulesRoutes } from './crawler_multiple_schedules';
import { registerCrawlerSitemapRoutes } from './crawler_sitemaps';

export function registerCrawlerRoutes(routeDependencies: RouteDependencies) {
  const { router, enterpriseSearchRequestHandler, log } = routeDependencies;

  router.post(
    {
      path: '/internal/enterprise_search/crawler',
      validate: {
        body: schema.object({
          index_name: schema.string(),
          language: schema.oneOf([schema.string(), schema.literal(null)]),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const connParams = {
        delete_existing_connector: true,
        index_name: request.body.index_name,
        is_native: true,
        language: request.body.language,
        service_type: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
      };
      const { client } = (await context.core).elasticsearch;

      const indexExists = await client.asCurrentUser.indices.exists({
        index: request.body.index_name,
      });
      if (indexExists) {
        return createError({
          errorCode: ErrorCode.INDEX_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.addCrawler.indexExistsError',
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
            'xpack.enterpriseSearch.server.routes.addCrawler.crawlerExistsError',
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
            'xpack.enterpriseSearch.server.routes.addCrawler.connectorExistsError',
            {
              defaultMessage: 'A connector for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      try {
        await addConnector(client, connParams);
        const res = await enterpriseSearchRequestHandler.createRequest({
          path: '/api/ent/v1/internal/indices',
        })(context, request, response);

        if (res.status !== 200) {
          throw new Error(res.payload.message);
        }
        return res;
      } catch (error) {
        // clean up connector index if it was created
        const createdConnector = await fetchConnectorByIndexName(client, request.body.index_name);
        if (createdConnector) {
          await deleteConnectorById(client, createdConnector.id);
          await deleteIndex(client, createdConnector.index_name);
        }

        throw error;
      }
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/crawler/validate_url',
      validate: {
        body: schema.object({
          checks: schema.arrayOf(schema.string()),
          url: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/crawler2/validate_url',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests',
      validate: {
        body: schema.object({
          overrides: schema.maybe(
            schema.object({
              domain_allowlist: schema.maybe(schema.arrayOf(schema.string())),
              max_crawl_depth: schema.maybe(schema.number()),
              seed_urls: schema.maybe(schema.arrayOf(schema.string())),
              sitemap_discovery_disabled: schema.maybe(schema.boolean()),
              sitemap_urls: schema.maybe(schema.arrayOf(schema.string())),
            })
          ),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/cancel',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/active/cancel',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_requests/{crawlRequestId}',
      validate: {
        params: schema.object({
          crawlRequestId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_requests/:crawlRequestId',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.number(),
          'page[size]': schema.number(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains',
      validate: {
        body: schema.object({
          entry_points: schema.arrayOf(
            schema.object({
              value: schema.string(),
            })
          ),
          name: schema.string(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        body: schema.object({
          auth: schema.maybe(
            schema.nullable(
              schema.object({
                header: schema.maybe(schema.string()),
                password: schema.maybe(schema.string()),
                type: schema.string(),
                username: schema.maybe(schema.string()),
              })
            )
          ),
          crawl_rules: schema.maybe(
            schema.arrayOf(
              schema.object({
                id: schema.string(),
                order: schema.number(),
              })
            )
          ),
          deduplication_enabled: schema.maybe(schema.boolean()),
          deduplication_fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domains/{domainId}',
      validate: {
        params: schema.object({
          domainId: schema.string(),
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domains/:domainId',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/domain_configs',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        query: schema.object({
          'page[current]': schema.maybe(schema.number()),
          'page[size]': schema.maybe(schema.number()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/domain_configs',
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/process_crawls',
      validate: {
        body: schema.object({
          domains: schema.maybe(schema.arrayOf(schema.string())),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/process_crawls',
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        body: schema.object({
          frequency: schema.number(),
          unit: schema.string(),
          use_connector_schedule: schema.boolean(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/crawl_schedule',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/api/ent/v1/internal/indices/:indexName/crawler2/crawl_schedule',
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/html_extraction',
      validate: {
        body: schema.object({
          extract_full_html: schema.boolean(),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const connector = await fetchConnectorByIndexName(client, request.params.indexName);
      if (
        connector &&
        connector.service_type === ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
      ) {
        await updateHtmlExtraction(client, request.body.extract_full_html, connector);
        return response.ok();
      } else {
        return createError({
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.updateHtmlExtraction.noCrawlerFound',
            {
              defaultMessage: 'Could not find a crawler for this index',
            }
          ),
          response,
          statusCode: 404,
        });
      }
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/indices/{indexName}/crawler/connector',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const connector = await fetchConnectorByIndexName(client, request.params.indexName);
      if (connector) {
        return createError({
          errorCode: ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.recreateConnector.connectorExistsError',
            {
              defaultMessage: 'A connector for this index already exists',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      const connectorId = await recreateConnectorDocument(client, request.params.indexName);
      return response.ok({ body: { connector_id: connectorId } });
    })
  );

  registerCrawlerCrawlRulesRoutes(routeDependencies);
  registerCrawlerEntryPointRoutes(routeDependencies);
  registerCrawlerSitemapRoutes(routeDependencies);
  registerCrawlerMultipleSchedulesRoutes(routeDependencies);
}
