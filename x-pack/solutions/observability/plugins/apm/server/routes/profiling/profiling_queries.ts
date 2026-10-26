/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery, termQuery } from '@kbn/observability-plugin/server';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getHostsProfilingKuery } from './utils';

interface TimeRangeInSeconds {
  /** In seconds */
  start: number;
  /** In seconds */
  end: number;
}

const timeRangeQuery = ({ start, end }: TimeRangeInSeconds): QueryDslQueryContainer => ({
  range: {
    '@timestamp': {
      gte: String(start),
      lt: String(end),
      format: 'epoch_second',
    },
  },
});

/** APM transactions of a service, whose profiler stacktrace IDs are the profiling samples */
export function getTransactionsProfilingQuery({
  start,
  end,
  kuery,
  serviceName,
  transactionName,
  environment,
  transactionType,
}: TimeRangeInSeconds & {
  kuery: string;
  serviceName: string;
  transactionName?: string;
  environment: string;
  transactionType: string;
}): QueryDslQueryContainer {
  return {
    bool: {
      filter: [
        ...kqlQuery(kuery),
        ...termQuery(SERVICE_NAME, serviceName),
        ...termQuery(TRANSACTION_NAME, transactionName),
        ...environmentQuery(environment),
        ...termQuery(TRANSACTION_TYPE, transactionType),
        timeRangeQuery({ start, end }),
      ],
    },
  };
}

/**
 * Profiling events matching a pre-built KQL string and time range.
 * Used by the tiered scoping path where the kuery is already assembled per scope candidate.
 */
export function getProfilingEventsQueryFromKuery({
  start,
  end,
  kuery,
}: TimeRangeInSeconds & { kuery: string }): QueryDslQueryContainer {
  return {
    bool: {
      filter: [...kqlQuery(kuery), timeRangeQuery({ start, end })],
    },
  };
}

/** Profiling events of the containers or, when it has none, of the hosts of a service */
export function getHostsProfilingEventsQuery({
  start,
  end,
  kuery,
  hostNames,
  containerIds,
}: TimeRangeInSeconds & {
  kuery: string;
  hostNames: string[];
  containerIds: string[];
}): QueryDslQueryContainer {
  return {
    bool: {
      filter: [
        ...kqlQuery(getHostsProfilingKuery({ hostNames, containerIds, kuery })),
        timeRangeQuery({ start, end }),
      ],
    },
  };
}
