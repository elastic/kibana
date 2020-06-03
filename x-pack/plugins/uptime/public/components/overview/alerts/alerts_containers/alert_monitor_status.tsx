/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { selectMonitorStatusAlert, overviewFiltersSelector } from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';
import { fetchOverviewFilters, setSearchText } from '../../../../state/actions';

interface Props {
  alertParams: { [key: string]: any };
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
    // example output: `now-13h`
    const dateRangeStart = `now-${alertParams?.timerangeCount ?? 15}${
      alertParams?.timerangeUnit ?? 'd'
    }`;
    dispatch(
      fetchOverviewFilters({
        dateRangeStart,
        dateRangeEnd: 'now',
        locations: alertParams.filters?.['observer.geo.name'] ?? [],
        ports: alertParams.filters?.['url.port'] ?? [],
        tags: alertParams.filters?.tags ?? [],
        schemes: alertParams.filters?.['monitor.type'] ?? [],
      })
    );
  }, [alertParams, dispatch]);

  const overviewFilters = useSelector(overviewFiltersSelector);
  const { locations } = useSelector(selectMonitorStatusAlert);
  useEffect(() => {
    if (alertParams.search) {
      dispatch(setSearchText(alertParams.search));
    }
  }, [alertParams, dispatch]);

  return (
    <AlertMonitorStatusComponent
      autocomplete={autocomplete}
      enabled={enabled}
      hasFilters={!!overviewFilters?.filters}
      alertParams={alertParams}
      locations={locations}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
