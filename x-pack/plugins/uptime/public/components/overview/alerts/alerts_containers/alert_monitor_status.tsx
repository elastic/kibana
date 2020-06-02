/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import {
  selectMonitorStatusAlert,
  selectSearchText,
  overviewFiltersSelector,
} from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';
import { setOverviewFilters, fetchOverviewFilters } from '../../../../state/actions';

interface Props {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatus: React.FC<Props> = ({
  autocomplete,
  enabled,
  numTimes,
  setAlertParams,
  timerange,
  alertParams,
}) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      fetchOverviewFilters({
        dateRangeStart: `now-${alertParams?.timerangeCount ?? 15}${
          alertParams?.timerangeUnit ?? 'd'
        }`,
        dateRangeEnd: 'now',
        locations: alertParams?.filters['observer.geo.name'] ?? [],
        ports: alertParams?.filters['url.port'] ?? [],
        tags: alertParams?.filters.tags ?? [],
        schemes: alertParams?.filters['monitor.type'] ?? [],
      })
    );
  }, [alertParams, dispatch]);

  const setFilters = useCallback(
    (filters: any) => {
      dispatch(setOverviewFilters(filters));
    },
    [dispatch]
  );

  const overviewFilters = useSelector(overviewFiltersSelector);
  const { filters, locations } = useSelector(selectMonitorStatusAlert);
  const searchText = useSelector(selectSearchText);
  useEffect(() => {
    setAlertParams('search', searchText);
  }, [setAlertParams, searchText]);

  return (
    <AlertMonitorStatusComponent
      autocomplete={autocomplete}
      enabled={enabled}
      filters={overviewFilters.filters}
      alertParams={alertParams}
      setFilters={setFilters}
      locations={locations}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
