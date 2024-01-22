/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchRequest, ISearchRequestParams } from '@kbn/data-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { lastValueFrom } from 'rxjs';
import { DataStreamQualityCheck } from './types';

export const checkForIgnoredFields: DataStreamQualityCheck = {
  id: 'ignored-fields',
  apply:
    ({ search }) =>
    async ({ dataStream, timeRange }) => {
      const request: IEsSearchRequest<ISearchRequestParams> = {
        params: {
          index: dataStream,
          allow_no_indices: true,
          ignore_unavailable: true,
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    exists: {
                      field: '_ignored',
                    },
                  },
                  {
                    range: {
                      '@timestamp': {
                        gt: timeRange.start,
                        lte: timeRange.end,
                      },
                    },
                  },
                ],
              },
            },
            runtime_mappings: {
              __runtimeIgnored: {
                type: 'keyword',
                script: {
                  source: "for (def v : params['_fields']._ignored.values) { emit(v); }",
                },
              },
            },
            aggregations: {
              ignoredFields: {
                composite: {
                  sources: [
                    {
                      __runtimeIgnored: {
                        terms: {
                          field: '__runtimeIgnored',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const { rawResponse } = await lastValueFrom(search(request));

      const parsedResponse = decodeOrThrow(ignoredFieldsResponseRT)(rawResponse);

      const ignoredFields = parsedResponse.aggregations.ignoredFields.buckets.map(
        ({ key: { __runtimeIgnored: fieldName }, doc_count: documentCount }) => ({
          fieldName,
          documentCount,
        })
      );

      if (ignoredFields.length > 0) {
        return {
          type: 'failed',
          reasons: ignoredFields.map(({ fieldName, documentCount }) => ({
            type: 'ignored-field',
            field_name: fieldName,
            document_count: documentCount,
          })),
        };
      }

      return {
        type: 'passed',
      };
    },
};

const ignoredFieldsResponseRT = rt.strict({
  aggregations: rt.strict({
    ignoredFields: rt.strict({
      buckets: rt.array(
        rt.strict({
          key: rt.strict({
            __runtimeIgnored: rt.string,
          }),
          doc_count: rt.number,
        })
      ),
    }),
  }),
});
