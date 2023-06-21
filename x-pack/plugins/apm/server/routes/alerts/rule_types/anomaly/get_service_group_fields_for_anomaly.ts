/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { firstValueFrom } from 'rxjs';
import {
  IScopedClusterClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_DURATION,
} from '../../../../../common/es_fields/apm';
import { alertingEsClient } from '../../alerting_es_client';
import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
} from '../get_service_group_fields';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
import { RegisterRuleDependencies } from '../../register_apm_rule_types';

export async function getServiceGroupFieldsForAnomaly({
  config$,
  scopedClusterClient,
  savedObjectsClient,
  serviceName,
  environment,
  transactionType,
  timestamp,
  bucketSpan,
}: {
  config$: RegisterRuleDependencies['config$'];
  scopedClusterClient: IScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  serviceName: string;
  environment: string;
  transactionType: string;
  timestamp: number;
  bucketSpan: number;
}) {
  const config = await firstValueFrom(config$);
  const indices = await getApmIndices({
    config,
    savedObjectsClient,
  });
  const { transaction: index } = indices;

  const params = {
    index,
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
        ...getServiceGroupFieldsAgg({
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
  return getServiceGroupFields(response.aggregations);
}
