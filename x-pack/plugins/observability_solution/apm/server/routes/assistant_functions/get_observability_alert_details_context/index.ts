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

  const serviceSummaryPromise = query['service.name']
    ? getApmServiceSummary({
        apmEventClient,
        annotationsClient,
        esClient,
        apmAlertsClient,
        mlClient,
        logger,
        arguments: {
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
          end: alertStartedAt,
        },
      })
    : undefined;

  const downstreamDependenciesPromise = query['service.name']
    ? getAssistantDownstreamDependencies({
        apmEventClient,
        arguments: {
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
          end: alertStartedAt,
        },
      })
    : undefined;

  const logCategoriesPromise = getLogCategories({
    esClient,
    coreContext,
    arguments: {
      start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
      end: alertStartedAt,
      'service.name': query['service.name'],
      'host.name': query['host.name'],
      'container.id': query['container.id'],
    },
  });

  const serviceChangePointsPromise = getServiceChangePoints({
    apmEventClient,
    alertStartedAt,
    query,
  });

  const exitSpanChangePointsPromise = getExitSpanChangePoints({
    apmEventClient,
    alertStartedAt,
    query,
  });

  const anomaliesPromise = getAnomalies({
    start: moment(alertStartedAt).subtract(1, 'hour').valueOf(),
    end: moment(alertStartedAt).valueOf(),
    environment: query['service.environment'],
    mlClient,
    logger,
  });

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
  query,
}: {
  apmEventClient: APMEventClient;
  alertStartedAt: string;
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
}) {
  if (!query['service.name']) {
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
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          timeseries: {
            name: ApmTimeseriesType.transactionLatency,
            function: LatencyAggregationType.p95,
            'transaction.type': query['transaction.type'],
            'transaction.name': query['transaction.name'],
          },
        },
        {
          title: 'Throughput',
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          timeseries: {
            name: ApmTimeseriesType.transactionThroughput,
            'transaction.type': query['transaction.type'],
            'transaction.name': query['transaction.name'],
          },
        },
        {
          title: 'Failure rate',
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          timeseries: {
            name: ApmTimeseriesType.transactionFailureRate,
            'transaction.type': query['transaction.type'],
            'transaction.name': query['transaction.name'],
          },
        },
        {
          title: 'Error events',
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
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
  query,
}: {
  apmEventClient: APMEventClient;
  alertStartedAt: string;
  query: t.TypeOf<typeof observabilityAlertDetailsContextRt>;
}) {
  if (!query['service.name']) {
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
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
          timeseries: {
            name: ApmTimeseriesType.exitSpanLatency,
          },
        },
        {
          title: 'Exit span failure rate',
          'service.name': query['service.name'],
          'service.environment': query['service.environment'],
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
