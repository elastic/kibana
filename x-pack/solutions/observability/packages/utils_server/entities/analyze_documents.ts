/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { mergeSampleDocumentsWithFieldCaps } from '@kbn/observability-utils-common/llm/log_analysis/merge_sample_documents_with_field_caps';
import { DocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import type { ObservabilityElasticsearchClient } from '../es/client/create_observability_es_client';
import { kqlQuery } from '../es/queries/kql_query';
import { rangeQuery } from '../es/queries/range_query';

export async function analyzeDocuments({
  esClient,
  kuery,
  start,
  end,
  index,
}: {
  esClient: ObservabilityElasticsearchClient;
  kuery: string;
  start: number;
  end: number;
  index: string | string[];
}): Promise<DocumentAnalysis> {
  const [fieldCaps, hits] = await Promise.all([
    esClient.fieldCaps('get_field_caps_for_document_analysis', {
      index,
      fields: '*',
      index_filter: {
        bool: {
          filter: rangeQuery(start, end),
        },
      },
    }),
    esClient
      .search('get_document_samples', {
        index,
        size: 1000,
        track_total_hits: true,
        query: {
          bool: {
            must: [...kqlQuery(kuery), ...rangeQuery(start, end)],
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
        total: response.hits.total,
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
