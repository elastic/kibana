/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { getMobileSessions } from './get_mobile_sessions';
import { getMobileHttpRequests } from './get_mobile_http_requests';
import { getMobileCrashRate } from './get_mobile_crash_rate';
import { Maybe } from '../../../typings/common';

export interface Timeseries {
  x: number;
  y: number;
}
interface MobileStats {
  sessions: { timeseries: Timeseries[]; value: Maybe<number> };
  requests: { timeseries: Timeseries[]; value: Maybe<number> };
  crashes: { timeseries: Timeseries[]; value: Maybe<number> };
}

export interface MobilePeriodStats {
  currentPeriod: MobileStats;
  previousPeriod: MobileStats;
}

interface Props {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  offset?: string;
}

async function getMobileStats({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  offset,
}: Props): Promise<MobileStats> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    environment,
    start: startWithOffset,
    end: endWithOffset,
    offset,
  };

  const [sessions, httpRequests, crashes] = await Promise.all([
    getMobileSessions({ ...commonProps }),
    getMobileHttpRequests({ ...commonProps }),
    getMobileCrashRate({ ...commonProps }),
  ]);

  return {
    sessions: {
      value: sessions.currentPeriod.value,
      timeseries: sessions.currentPeriod.timeseries as Timeseries[],
    },
    requests: {
      value: httpRequests.currentPeriod.value,
      timeseries: httpRequests.currentPeriod.timeseries as Timeseries[],
    },
    crashes: {
      value: crashes.currentPeriod.value,
      timeseries: crashes.currentPeriod.timeseries as Timeseries[],
    },
  };
}

export async function getMobileStatsPeriods({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  offset,
}: Props): Promise<MobilePeriodStats> {
  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    environment,
    start,
    end,
  };

  const currentPeriodPromise = getMobileStats({
    ...commonProps,
  });

  const previousPeriodPromise = offset
    ? getMobileStats({
        ...commonProps,
        offset,
      })
    : {
        sessions: { timeseries: [], value: null },
        requests: { timeseries: [], value: null },
        crashes: { timeseries: [], value: null },
      };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  return {
    currentPeriod,
    previousPeriod,
  };
}
