/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLIENT_GEO_COUNTRY_NAME } from '../../../common/es_fields/apm';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSessionsByLocation } from './get_mobile_sessions_by_location';
import { getHttpRequestsByLocation } from './get_mobile_http_requests_by_location';
import { getCrashesByLocation } from './get_mobile_crashes_by_location';
import { getLaunchesByLocation } from './get_mobile_launches_by_location';
import { Maybe } from '../../../typings/common';

export type Timeseries = Array<{ x: number; y: number }>;

interface LocationStats {
  mostSessions: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostRequests: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostCrashes: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
  mostLaunches: {
    location?: string;
    value: Maybe<number>;
    timeseries: Timeseries;
  };
}

export interface MobileLocationStats {
  currentPeriod: LocationStats;
  previousPeriod: LocationStats;
}

interface Props {
  kuery: string;
  apmEventClient: APMEventClient;
  serviceName: string;
  environment: string;
  start: number;
  end: number;
  locationField?: string;
  offset?: string;
}

async function getMobileLocationStats({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  locationField = CLIENT_GEO_COUNTRY_NAME,
  offset,
}: Props) {
  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    environment,
    start,
    end,
    locationField,
    offset,
  };

  const [mostSessions, mostRequests, mostCrashes, mostLaunches] = await Promise.all([
    getSessionsByLocation({ ...commonProps }),
    getHttpRequestsByLocation({ ...commonProps }),
    getCrashesByLocation({ ...commonProps }),
    getLaunchesByLocation({ ...commonProps }),
  ]);

  return {
    mostSessions,
    mostRequests,
    mostCrashes,
    mostLaunches,
  };
}

export async function getMobileLocationStatsPeriods({
  kuery,
  apmEventClient,
  serviceName,
  environment,
  start,
  end,
  locationField,
  offset,
}: Props): Promise<MobileLocationStats> {
  const commonProps = {
    kuery,
    apmEventClient,
    serviceName,
    environment,
    locationField,
  };

  const currentPeriodPromise = getMobileLocationStats({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getMobileLocationStats({
        ...commonProps,
        start,
        end,
        offset,
      })
    : {
        mostSessions: { value: null, timeseries: [] },
        mostRequests: { value: null, timeseries: [] },
        mostCrashes: { value: null, timeseries: [] },
        mostLaunches: { value: null, timeseries: [] },
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
