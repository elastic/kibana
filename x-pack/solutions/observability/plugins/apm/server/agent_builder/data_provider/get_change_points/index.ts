/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { TimeseriesChangePoint } from './get_apm_timeseries';
import { ApmTimeseriesType, getApmTimeseries } from './get_apm_timeseries';

export interface ChangePointGrouping {
  title: string;
  grouping: string;
  changes: TimeseriesChangePoint[];
}

export async function getServiceChangePoints({
  apmEventClient,
  start,
  end,
  serviceName,
  serviceEnvironment,
  transactionType,
  transactionName,
}: {
  apmEventClient: APMEventClient;
  start: string;
  end: string;
  serviceName: string | undefined;
  serviceEnvironment: string | undefined;
  transactionType: string | undefined;
  transactionName: string | undefined;
}): Promise<ChangePointGrouping[]> {
  if (!serviceName) {
    return [];
  }

  const res = await getApmTimeseries({
    apmEventClient,
    arguments: {
      start,
      end,
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

export async function getExitSpanChangePoints({
  apmEventClient,
  start,
  end,
  serviceName,
  serviceEnvironment,
}: {
  apmEventClient: APMEventClient;
  start: string;
  end: string;
  serviceName: string | undefined;
  serviceEnvironment: string | undefined;
}): Promise<ChangePointGrouping[]> {
  if (!serviceName) {
    return [];
  }

  const res = await getApmTimeseries({
    apmEventClient,
    arguments: {
      start,
      end,
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
