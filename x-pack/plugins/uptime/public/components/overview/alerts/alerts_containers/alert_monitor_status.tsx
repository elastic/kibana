/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { isRight } from 'fp-ts/lib/Either';
import { selectMonitorStatusAlert, overviewFiltersSelector } from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';
import {
  fetchOverviewFilters,
  setSearchTextAction,
  setEsKueryString,
} from '../../../../state/actions';
import { AtomicStatusCheckParamsType } from '../../../../../common/runtime_types';
import { useIndexPattern } from '../../kuery_bar/use_index_pattern';
import { useUpdateKueryString } from '../../../../hooks';

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
    dispatch(
      fetchOverviewFilters({
        dateRangeStart: 'now-15m',
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
      dispatch(setSearchTextAction(alertParams.search));
    }
  }, [alertParams, dispatch]);

  const { index_pattern: indexPattern } = useIndexPattern();
  const [esFilters] = useUpdateKueryString(
    indexPattern,
    alertParams.search,
    typeof alertParams.filters === 'string' ? {} : alertParams.filters
  );

  useEffect(() => {
    dispatch(setEsKueryString(esFilters ?? ''));
  }, [dispatch, esFilters]);

  const isOldAlert = React.useMemo(
    () => !isRight(AtomicStatusCheckParamsType.decode(alertParams)),
    [alertParams]
  );

  return (
    <AlertMonitorStatusComponent
      alertParams={alertParams}
      autocomplete={autocomplete}
      enabled={enabled}
      hasFilters={!!overviewFilters?.filters}
      isOldAlert={isOldAlert}
      locations={locations}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
