/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext, PluginStart } from '@kbn/data-plugin/server';

import { categorizeSchema } from '../../common/api/log_categorization';
import { API_ENDPOINT } from '../../common/api';
import { wrapError } from '../lib/error_wrapper';

import type { AiopsLicense } from '../types';

export const defineLogCategorizationRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  logger: Logger,
  dataStart: PluginStart
) => {
  router.post(
    {
      path: API_ENDPOINT.CATEGORIZE,
      validate: {
        body: categorizeSchema,
      },
    },
    async (context, request, response) => {
      if (!license.isActivePlatinumLicense) {
        return response.forbidden();
      }

      const client = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const { field, timeField, from, to, query, intervalMs } = request.body;
        if (query.bool === undefined) {
          query.bool = {};
        }
        if (query.bool.must === undefined) {
          query.bool.must = [];
          if (query.match_all !== undefined) {
            query.bool.must.push({ match_all: query.match_all });
            delete query.match_all;
          }
        }
        if (query.multi_match !== undefined) {
          query.bool.should = {
            multi_match: query.multi_match,
          };
          delete query.multi_match;
        }

        query.bool.must.push({
          range: {
            [timeField]: {
              gte: from,
              lte: to,
              format: 'epoch_millis',
            },
          },
        });
        // dataStart.search.getSearchStrategy().search({})
        const resp = await client.search<unknown, { categories: { buckets: any[] } }>({
          index: request.body.index,
          size: 0,
          body: {
            query,
            aggs: {
              categories: {
                categorize_text: {
                  field,
                  size: 1000,
                },
                aggs: {
                  hit: {
                    top_hits: {
                      size: 3,
                      sort: [timeField],
                      _source: field,
                    },
                  },
                  ...(intervalMs
                    ? {
                        sparkline: {
                          date_histogram: {
                            field: timeField,
                            fixed_interval: `${intervalMs}ms`,
                          },
                        },
                      }
                    : {}),
                },
              },
            },
          },
        });

        const body = resp.aggregations!.categories.buckets.map((b) => ({
          key: b.key,
          count: b.doc_count,
          examples: b.hit.hits.hits.map((h: any) => h._source[field]),
          ...(b.sparkline ? { sparkline: b.sparkline.buckets } : {}),
        }));

        return response.ok({ body });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
};
