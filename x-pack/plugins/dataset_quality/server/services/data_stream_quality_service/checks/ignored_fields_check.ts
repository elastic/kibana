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
import { IgnoredFieldCause } from '../../../../common';
import {
  DataStreamQualityCheck,
  DataStreamQualityCheckArguments,
  DataStreamQualityCheckDependencies,
} from './types';

export const checkForIgnoredFields: DataStreamQualityCheck = {
  id: 'ignored-fields',
  apply:
    ({ search, elasticsearchClient }) =>
    async ({ dataStream, timeRange }) => {
      const ignoredFields = await findIgnoredFields({ search })({ dataStream, timeRange });

      if (ignoredFields.length > 0) {
        return {
          type: 'failed',
          reasons: await Promise.all(
            ignoredFields.map(async ({ fieldName, documentCount }) => ({
              type: 'ignored-field',
              field_name: fieldName,
              document_count: documentCount,
              causes: [],
            }))
          ),
        };
      }

      return {
        type: 'passed',
      };
    },
};

const findIgnoredFields =
  ({ search }: Pick<DataStreamQualityCheckDependencies, 'search'>) =>
  async ({
    dataStream,
    timeRange,
  }: Pick<DataStreamQualityCheckArguments, 'dataStream' | 'timeRange'>) => {
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

    return ignoredFields;
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

const findIgnoredFieldCauses =
  ({
    search,
    elasticsearchClient,
  }: Pick<DataStreamQualityCheckDependencies, 'search' | 'elasticsearchClient'>) =>
  async (
    fieldName: string,
    { dataStream, timeRange }: Pick<DataStreamQualityCheckArguments, 'dataStream' | 'timeRange'>
  ): Promise<IgnoredFieldCause[]> => {
    return [
      {
        type: 'unknown',
      },
    ];
  };
