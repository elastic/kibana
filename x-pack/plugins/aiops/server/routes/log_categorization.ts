/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import { categorizeSchema } from '../../common/api/log_categorization';
import { API_ENDPOINT } from '../../common/api';
import { wrapError } from '../lib/error_wrapper';

import type { AiopsLicense } from '../types';

export const defineLogCategorizationRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  logger: Logger
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
        const { field, timeField, from, to, intervalMs } = request.body;
        const resp = await client.search<unknown, { categories: { buckets: any[] } }>({
          index: request.body.index,
          size: 0,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      [timeField]: {
                        gte: from,
                        lte: to,
                      },
                    },
                  },
                ],
              },
            },
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
