/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { mergeSampleDocumentsWithFieldCaps } from '@kbn/genai-utils-common/src/data_analysis/merge_sample_documents_with_field_caps';
import { DocumentAnalysis } from '@kbn/genai-utils-common/src/data_analysis/types';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { mapValues } from 'lodash';
import { rangeQuery } from '../es/queries/range_query';

export async function getDataAnalysis({
  esClient,
  kuery,
  start,
  end,
  index,
}: {
  esClient: TracedElasticsearchClient;
  kuery: string;
  start: number;
  end: number;
  index: string | string[];
}): Promise<DocumentAnalysis> {
  const timerangeQuery = rangeQuery(start, end);

  const [fieldCaps, hits] = await Promise.all([
    esClient.fieldCaps('get_field_caps_for_data_analysis', {
      index,
      fields: '*',
      index_filter: {
        bool: {
          filter: timerangeQuery,
        },
      },
    }),
    esClient
      .search('get_document_samples_for_data_analysis', {
        index,
        size: 1000,
        track_total_hits: true,
        query: {
          bool: {
            must: [
              ...(kuery
                ? [
                    {
                      kql: {
                        query: kuery,
                      },
                    } as QueryDslQueryContainer,
                  ]
                : []),
              ...timerangeQuery,
            ],
            should: [
              {
                function_score: {
                  functions: [
                    {
                      random_score: {},
                    },
                  ],
                },
              },
            ],
          },
        },
        sort: {
          _score: {
            order: 'desc',
          },
        },
        _source: false,
        fields: ['*' as const],
      })
      .then((response) => ({
        hits: response.hits.hits.map((hit) =>
          mapValues(hit.fields!, (value) => (value?.length === 1 ? value[0] : value))
        ),
        total: response.hits.total as { value: number },
      })),
  ]);

  const analysis = mergeSampleDocumentsWithFieldCaps({
    samples: hits.hits,
    total: hits.total.value,
    fieldCaps: Object.entries(fieldCaps.fields).map(([name, specs]) => {
      return { name, esTypes: Object.keys(specs) };
    }),
  });

  return analysis;
}
