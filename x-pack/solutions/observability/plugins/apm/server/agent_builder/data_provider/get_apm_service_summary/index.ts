/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import * as t from 'io-ts';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { Environment } from '../../../../common/environment_rt';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { termQuery } from '../../../../common/utils/term_query';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import { getEnvironments } from '../../../routes/environments/get_environments';
import { getServiceAnnotations } from '../../../routes/services/annotations';
import { getServiceMetadataDetails } from '../../../routes/services/get_service_metadata_details';
import { getAnomalies } from './get_anomalies';

export const serviceSummaryRouteRt = t.intersection([
  t.type({
    'service.name': t.string,
    start: t.string,
    end: t.string,
  }),
  t.partial({
    'service.environment': t.string,
    'transaction.type': t.string,
  }),
]);

export interface ServiceSummary {
  'service.name': string;
  'service.environment': string[];
  'agent.name'?: string;
  'service.version'?: string[];
  'language.name'?: string;
  'service.framework'?: string;
  instances: number;
  anomalies:
    | Array<{
        '@timestamp': string;
        metricName: string;
        'service.name': string;
        'service.environment': Environment;
        'transaction.type': string;
        anomalyScore: string | number | null;
        actualValue: number;
        expectedBoundsLower: number;
        expectedBoundsUpper: number;
      }>
    | {
        error: unknown;
      };
  alerts: Array<{ type?: string; started: string }>;
  deployments: Array<{ '@timestamp': string }>;
}

export async function getApmServiceSummary({
  arguments: args,
  apmEventClient,
  mlClient,
  esClient,
  annotationsClient,
  apmAlertsClient,
  logger,
}: {
  arguments: t.TypeOf<typeof serviceSummaryRouteRt>;
  apmEventClient: APMEventClient;
  mlClient?: MlClient;
  esClient: ElasticsearchClient;
  annotationsClient?: ScopedAnnotationsClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
}): Promise<ServiceSummary> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const serviceName = args['service.name'];
  const environment = args['service.environment'] || ENVIRONMENT_ALL.value;
  const transactionType = args['transaction.type'];

  const [environments, metadataDetails, anomalies, annotations, alerts] = await Promise.all([
    environment === ENVIRONMENT_ALL.value
      ? getEnvironments({
          apmEventClient,
          start,
          end,
          size: 10,
          serviceName,
          searchAggregatedTransactions: true,
        })
      : Promise.resolve([environment]),
    getServiceMetadataDetails({
      apmEventClient,
      start,
      end,
      serviceName,
      environment,
    }),
    getAnomalies({
      serviceName,
      start,
      end,
      environment: args['service.environment'],
      mlClient,
      logger,
      transactionType,
    }).catch((error) => {
      logger.warn('Failed to get anomalies', { error });
      return {
        error,
      };
    }),
    getServiceAnnotations({
      apmEventClient,
      start,
      end,
      searchAggregatedTransactions: true,
      client: esClient,
      annotationsClient,
      environment,
      logger,
      serviceName,
    }),
    apmAlertsClient.search({
      size: 100,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
            ...rangeQuery(start, end),
            ...termQuery(SERVICE_NAME, serviceName),
            ...environmentQuery(environment),
          ],
        },
      },
    }),
  ]);

  return {
    'service.name': serviceName,
    'service.environment': environments,
    'agent.name': metadataDetails.service?.agent.name,
    'service.version': metadataDetails.service?.versions,
    'language.name': metadataDetails.service?.agent.name,
    'service.framework': metadataDetails.service?.framework,
    instances: metadataDetails.container?.totalNumberInstances ?? 1,
    anomalies,
    alerts: alerts.hits.hits.map((alert) => ({
      type: alert._source?.['kibana.alert.rule.type'],
      started: new Date(alert._source?.['kibana.alert.start']!).toISOString(),
    })),
    deployments: annotations.annotations.map((annotation) => ({
      '@timestamp': new Date(annotation['@timestamp']).toISOString(),
    })),
  };
}
