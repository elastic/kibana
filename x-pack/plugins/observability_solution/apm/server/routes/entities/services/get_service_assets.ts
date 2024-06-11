/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { WrappedElasticsearchClientError } from '@kbn/observability-plugin/server';
import { merge, uniq } from 'lodash';
import { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { EntitiesESClient } from '../../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getEntities } from '../get_entities';
import { getServiceNamesPerSignalType } from '../utils/get_service_names_per_signal_type';
import { calculateAverageMetrics } from './calculate_metrics';
import { getServicesTransactionStats } from './get_services_transaction_stats';
import { mergeEntities } from './merge_entities';

export const MAX_NUMBER_OF_SERVICES = 1_000;

export async function getServiceAssets({
  assetsESClient,
  start,
  end,
  kuery,
  environment,
  logger,
  apmEventClient,
  logsDataAccessStart,
  esClient,
  documentType,
  rollupInterval,
  useDurationSummary,
}: {
  assetsESClient: EntitiesESClient;
  start: number;
  end: number;
  kuery: string;
  environment: string;
  logger: Logger;
  apmEventClient: APMEventClient;
  logsDataAccessStart: LogsDataAccessPluginStart;
  esClient: ElasticsearchClient;
  documentType: ApmServiceTransactionDocumentType;
  rollupInterval: RollupInterval;
  useDurationSummary: boolean;
}) {
  return withApmSpan('get_service_assets', async () => {
    try {
      const entities = await getEntities({
        assetsESClient,
        start,
        end,
        kuery,
        environment,
        size: MAX_NUMBER_OF_SERVICES,
      });

      console.log('entities', JSON.stringify(entities));

      // const serviceEntities = response.hits.hits.map((hit) => {
      //   return {
      //     name: hit._source.entity.id.split(':')[0],
      //     environments: hit._source.entity.id.split(':')[1] ?? null,
      //     ...(hit._source as ServiceAssetDocument),
      //   };
      // });

      // const mergeEntitiesRe = mergeEntities({ entities: serviceEntities });
      // console.log('mergeEntities', mergeEntitiesRe);
      // const entitiesAverages = calculateAverageMetrics(mergeEntitiesRe);
      // console.log('calculateAverageMetrics', entitiesAverages);
      // return entitiesAverages;
    } catch (error) {
      // If the index does not exist, handle it gracefully
      if (
        error instanceof WrappedElasticsearchClientError &&
        error.originalError instanceof errors.ResponseError
      ) {
        const type = error.originalError.body.error.type;

        if (type === 'index_not_found_exception') {
          logger.error(`Entities index does not exist. Unable to fetch services.`);
          return [];
        }
      }

      throw error;
    }
  });
}
