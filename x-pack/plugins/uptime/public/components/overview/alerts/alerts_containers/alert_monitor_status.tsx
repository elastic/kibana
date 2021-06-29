/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isRight } from 'fp-ts/lib/Either';
import { overviewFiltersSelector, selectedFiltersSelector } from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../monitor_status_alert/alert_monitor_status';
import { fetchOverviewFilters, setSearchTextAction } from '../../../../state/actions';
import {
  AtomicStatusCheckParamsType,
  GetMonitorAvailabilityParamsType,
} from '../../../../../common/runtime_types';

import { useSnapShotCount } from './use_snap_shot';

interface Props {
  alertParams: { [key: string]: any };
  enabled: boolean;
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatus: React.FC<Props> = ({
  enabled,
  numTimes,
  setAlertParams,
  timerange,
  alertParams,
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (!window.location.pathname.includes('/app/uptime')) {
      // filters inside uptime app already loaded
      dispatch(
        fetchOverviewFilters({
          dateRangeStart: 'now-24h',
          dateRangeEnd: 'now',
          locations: alertParams.filters?.['observer.geo.name'] ?? [],
          ports: alertParams.filters?.['url.port'] ?? [],
          tags: alertParams.filters?.tags ?? [],
          schemes: alertParams.filters?.['monitor.type'] ?? [],
        })
      );
    }
  }, [alertParams, dispatch]);

  const overviewFilters = useSelector(overviewFiltersSelector);

  useEffect(() => {
    if (alertParams.search) {
      dispatch(setSearchTextAction(alertParams.search));
    }
  }, [alertParams, dispatch]);

  const { count, loading } = useSnapShotCount({
    query: alertParams.search,
    filters: alertParams.filters,
  });

  const isOldAlert = React.useMemo(
    () =>
      Object.entries(alertParams).length > 0 &&
      !isRight(AtomicStatusCheckParamsType.decode(alertParams)) &&
      !isRight(GetMonitorAvailabilityParamsType.decode(alertParams)),
    [alertParams]
  );

  const selectedFilters = useSelector(selectedFiltersSelector);
  useEffect(() => {
    if (!alertParams.filters && selectedFilters !== null) {
      setAlertParams('filters', {
        // @ts-ignore
        'url.port': selectedFilters?.ports ?? [],
        // @ts-ignore
        'observer.geo.name': selectedFilters?.locations ?? [],
        // @ts-ignore
        'monitor.type': selectedFilters?.schemes ?? [],
        // @ts-ignore
        tags: selectedFilters?.tags ?? [],
      });
    }
  }, [alertParams, setAlertParams, selectedFilters]);

  return (
    <AlertMonitorStatusComponent
      alertParams={alertParams}
      enabled={enabled}
      hasFilters={!!overviewFilters?.filters}
      isOldAlert={isOldAlert}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      snapshotCount={count.total}
      snapshotLoading={loading}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
