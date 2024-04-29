/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreRequestHandlerContext, Logger } from '@kbn/core/server';
import moment from 'moment';
import * as t from 'io-ts';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { MlClient } from '../../../lib/helpers/get_ml_client';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { getApmServiceSummary } from '../get_apm_service_summary';
import { getAssistantDownstreamDependencies } from '../get_apm_downstream_dependencies';
import { getLogCategories } from '../get_log_categories';
import { ApmTimeseriesType, getApmTimeseries } from '../get_apm_timeseries';
import { getAnomalies } from '../get_apm_service_summary/get_anomalies';
import { getServiceNameFromSignals } from './get_service_name_from_signals';
import { getContainerIdFromSignals } from './get_container_id_from_signals';

export const observabilityAlertDetailsContextRt = t.intersection([
  t.type({
    alert_started_at: t.string,
  }),
  t.partial({
    // apm fields
    'service.name': t.string,
    'service.environment': t.string,
    'transaction.type': t.string,
    'transaction.name': t.string,

    // infrastructure fields
    'host.name': t.string,
    'container.id': t.string,
    'kubernetes.pod.name': t.string,
  }),
]);

export async function getObservabilityAlertDetailsContext({
  coreContext,
  annotationsClient,
  apmAlertsClient,
  apmEventClient,
  esClient,
  logger,
  mlClient,
  query,
}: {
  coreContext: CoreRequestHandlerContext;
  annotationsClient?: ScopedAnnotationsClient;
  apmAlertsClient: ApmAlertsClient;
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  mlClient?: MlClient;
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
}) {
  const alertStartedAt = query.alert_started_at;
  const serviceEnvironment = query['service.environment'];
  const hostName = query['host.name'];
  const kubernetesPodName = query['kubernetes.pod.name'];
  const [serviceName, containerId] = await Promise.all([
    getServiceNameFromSignals({
      query,
      esClient,
      coreContext,
      apmEventClient,
    }),
    getContainerIdFromSignals({
      query,
      esClient,
      coreContext,
      apmEventClient,
    }),
  ]);

  async function handleError<T>(cb: () => Promise<T>): Promise<T | undefined> {
    try {
      return await cb();
    } catch (error) {
      logger.error('Error while fetching observability alert details context');
      logger.error(error);
      return;
    }
  }

  const serviceSummaryPromise = serviceName
    ? handleError(() =>
        getApmServiceSummary({
          apmEventClient,
          annotationsClient,
          esClient,
          apmAlertsClient,
          mlClient,
          logger,
          arguments: {
            'service.name': serviceName,
            'service.environment': serviceEnvironment,
            start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
            end: alertStartedAt,
          },
        })
      )
    : undefined;

  const downstreamDependenciesPromise = serviceName
    ? handleError(() =>
        getAssistantDownstreamDependencies({
          apmEventClient,
          arguments: {
            'service.name': serviceName,
            'service.environment': serviceEnvironment,
            start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
            end: alertStartedAt,
          },
        })
      )
    : undefined;

  const logCategoriesPromise = handleError(() =>
    getLogCategories({
      esClient,
      coreContext,
      arguments: {
        start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
        end: alertStartedAt,
        'service.name': serviceName,
        'host.name': hostName,
        'container.id': containerId,
        'kubernetes.pod.name': kubernetesPodName,
      },
    })
  );

  const serviceChangePointsPromise = handleError(() =>
    getServiceChangePoints({
      apmEventClient,
      alertStartedAt,
      serviceName,
      serviceEnvironment,
      transactionType: query['transaction.type'],
      transactionName: query['transaction.name'],
    })
  );

  const exitSpanChangePointsPromise = handleError(() =>
    getExitSpanChangePoints({
      apmEventClient,
      alertStartedAt,
      serviceName,
      serviceEnvironment,
    })
  );

  const anomaliesPromise = handleError(() =>
    getAnomalies({
      start: moment(alertStartedAt).subtract(1, 'hour').valueOf(),
      end: moment(alertStartedAt).valueOf(),
      environment: serviceEnvironment,
      mlClient,
      logger,
    })
  );

  const [
    serviceSummary,
    downstreamDependencies,
    logCategories,
    serviceChangePoints,
    exitSpanChangePoints,
    anomalies,
  ] = await Promise.all([
    serviceSummaryPromise,
    downstreamDependenciesPromise,
    logCategoriesPromise,
    serviceChangePointsPromise,
    exitSpanChangePointsPromise,
    anomaliesPromise,
  ]);

  return {
    serviceSummary,
    downstreamDependencies,
    logCategories,
    serviceChangePoints,
    exitSpanChangePoints,
    anomalies,
  };
}

async function getServiceChangePoints({
  apmEventClient,
  alertStartedAt,
  serviceName,
  serviceEnvironment,
  transactionType,
  transactionName,
}: {
  apmEventClient: APMEventClient;
  alertStartedAt: string;
  serviceName: string | undefined;
  serviceEnvironment: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
}) {
  if (!serviceName) {
    return [];
  }

  const res = await getApmTimeseries({
    apmEventClient,
    arguments: {
      start: moment(alertStartedAt).subtract(12, 'hours').toISOString(),
      end: alertStartedAt,
      stats: [
        {
          title: 'Latency',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.transactionLatency,
            function: LatencyAggregationType.p95,
            'transaction.type': transactionType,
            'transaction.name': transactionName,
          },
        },
        {
          title: 'Throughput',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.transactionThroughput,
            'transaction.type': transactionType,
            'transaction.name': transactionName,
          },
        },
        {
          title: 'Failure rate',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.transactionFailureRate,
            'transaction.type': transactionType,
            'transaction.name': transactionName,
          },
        },
        {
          title: 'Error events',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.errorEventRate,
          },
        },
      ],
    },
  });

  return res
    .filter((timeseries) => timeseries.changes.length > 0)
    .map((timeseries) => ({
      title: timeseries.stat.title,
      grouping: timeseries.id,
      changes: timeseries.changes,
    }));
}

async function getExitSpanChangePoints({
  apmEventClient,
  alertStartedAt,
  serviceName,
  serviceEnvironment,
}: {
  apmEventClient: APMEventClient;
  alertStartedAt: string;
  serviceName: string | undefined;
  serviceEnvironment: string | undefined;
}) {
  if (!serviceName) {
    return [];
  }

  const res = await getApmTimeseries({
    apmEventClient,
    arguments: {
      start: moment(alertStartedAt).subtract(30, 'minute').toISOString(),
      end: alertStartedAt,
      stats: [
        {
          title: 'Exit span latency',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.exitSpanLatency,
          },
        },
        {
          title: 'Exit span failure rate',
          'service.name': serviceName,
          'service.environment': serviceEnvironment,
          timeseries: {
            name: ApmTimeseriesType.exitSpanFailureRate,
          },
        },
      ],
    },
  });

  return res
    .filter((timeseries) => timeseries.changes.length > 0)
    .map((timeseries) => {
      return {
        title: timeseries.stat.title,
        grouping: timeseries.id,
        changes: timeseries.changes,
      };
    });
}
