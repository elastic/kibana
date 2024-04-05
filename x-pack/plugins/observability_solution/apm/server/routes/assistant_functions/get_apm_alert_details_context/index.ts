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
import {
  ApmTimeseriesType,
  getApmTimeseries,
  TimeseriesChangePoint,
} from '../get_apm_timeseries';
import { getAnomalies } from '../get_apm_service_summary/get_anomalies';

export const apmAlertDetailsContextRt = t.intersection([
  t.type({
    'service.name': t.string,
    alert_started_at: t.string,
  }),
  t.partial({
    'service.environment': t.string,
    'transaction.type': t.string,
    'transaction.name': t.string,

    // alert fields
    'host.name': t.array(t.string),
    'container.id': t.array(t.string),
  }),
]);

export async function getApmAlertDetailsContext({
  coreContext,
  alertStartedAt,
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
  alertStartedAt: string;
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  mlClient?: MlClient;
  query: t.TypeOf<typeof apmAlertDetailsContextRt>;
}) {
  const serviceSummaryPromise = getApmServiceSummary({
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
  });

  const downstreamDependenciesPromise = getAssistantDownstreamDependencies({
    apmEventClient,
    arguments: {
      'service.name': query['service.name'],
      'service.environment': query['service.environment'],
      start: moment(alertStartedAt).subtract(5, 'minute').toISOString(),
      end: alertStartedAt,
    },
  });

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

  const serviceTimeseriesPromise = getApmTimeseries({
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

  const exitSpanTimeseriesPromise = getApmTimeseries({
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
    serviceTimeseries,
    exitSpanTimeseries,
    anomalies,
  ] = await Promise.all([
    serviceSummaryPromise,
    downstreamDependenciesPromise,
    logCategoriesPromise,
    serviceTimeseriesPromise,
    exitSpanTimeseriesPromise,
    anomaliesPromise,
  ]);

  const serviceChangePoints = serviceTimeseries.map(
    (
      timeseries
    ): {
      title: string;
      grouping: string;
      changes: TimeseriesChangePoint[];
    } => {
      return {
        title: timeseries.stat.title,
        grouping: timeseries.id,
        changes: timeseries.changes,
      };
    }
  );

  const exitSpanChangePoints = exitSpanTimeseries.map(
    (
      timeseries
    ): {
      title: string;
      grouping: string;
      changes: TimeseriesChangePoint[];
    } => {
      return {
        title: timeseries.stat.title,
        grouping: timeseries.id,
        changes: timeseries.changes,
      };
    }
  );

  return {
    serviceSummary,
    downstreamDependencies,
    logCategories,
    serviceChangePoints,
    exitSpanChangePoints,
    anomalies,
  };
}
