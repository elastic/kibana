/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IScopedClusterClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_DURATION,
} from '../../../../../common/es_fields/apm';
import { alertingEsClient } from '../../alerting_es_client';
import {
  getApmAlertSourceFields,
  getApmAlertSourceFieldsAgg,
} from '../get_apm_alert_source_fields';

export async function getServiceGroupFieldsForAnomaly({
  apmIndices,
  scopedClusterClient,
  serviceName,
  environment,
  transactionType,
  timestamp,
  bucketSpan,
}: {
  apmIndices: APMIndices;
  scopedClusterClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  serviceName: string;
  environment: string;
  transactionType: string;
  timestamp: number;
  bucketSpan: number;
}) {
  const params = {
    index: apmIndices.transaction,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { term: { [SERVICE_ENVIRONMENT]: environment } },
            {
              range: {
                '@timestamp': {
                  gte: timestamp,
                  lte: timestamp + bucketSpan * 1000,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      aggs: {
        ...getApmAlertSourceFieldsAgg({
          sort: [{ [TRANSACTION_DURATION]: { order: 'desc' as const } }],
        }),
      },
    },
  };

  const response = await alertingEsClient({
    scopedClusterClient,
    params,
  });

  if (!response.aggregations) {
    return {};
  }
  return getApmAlertSourceFields(response.aggregations);
}
