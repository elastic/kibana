/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { flatten } from 'lodash';
import { ApmDataSource } from '../../../common/data_source';
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { getConfigForDocumentType } from './create_es_client/document_type';

export async function getDocumentSources({
  apmEventClient,
  start,
  end,
  kuery,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
}) {
  const sources: Array<ApmDataSource & { hasDocs: boolean }> = flatten(
    await Promise.all(
      [
        ApmDocumentType.ServiceTransactionMetric as const,
        ApmDocumentType.TransactionMetric as const,
      ].map(async (documentType) => {
        const docTypeConfig = getConfigForDocumentType(documentType);
        const allHasDocs = await Promise.all(
          docTypeConfig.rollupIntervals.map(async (rollupInterval) => {
            const response = await apmEventClient.search(
              'check_document_type_availability',
              {
                apm: {
                  sources: [
                    {
                      documentType,
                      rollupInterval,
                    },
                  ],
                },
                body: {
                  track_total_hits: 1,
                  size: 0,
                  terminate_after: 1,
                  query: {
                    bool: {
                      filter: [...kqlQuery(kuery), ...rangeQuery(start, end)],
                    },
                  },
                },
              }
            );

            return {
              documentType,
              rollupInterval,
              hasDocs: response.hits.total.value > 0,
            };
          })
        );

        return allHasDocs;
      })
    )
  );

  sources.push({
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
  });

  return sources;
}
