/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityElasticsearchClient } from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import pLimit from 'p-limit';

export async function confirmConstantsInDataset({
  esClient,
  constants,
  indexPatterns,
}: {
  esClient: ObservabilityElasticsearchClient;
  constants: Array<{ field: string }>;
  indexPatterns: string[];
}): Promise<Array<{ field: string; constant: boolean; value?: string | number | boolean | null }>> {
  const limiter = pLimit(5);

  return Promise.all(
    constants.map((constant) => {
      return limiter(() => {
        return esClient.client
          .termsEnum({
            index: indexPatterns.join(','),
            field: constant.field,
            index_filter: {
              bool: {
                filter: [...excludeFrozenQuery()],
              },
            },
          })
          .then((response) => {
            const isConstant = response.terms.length === 1;
            return {
              field: constant.field,
              constant: isConstant,
              value: isConstant ? response.terms[0] : undefined,
            };
          });
      });
    })
  );
}
