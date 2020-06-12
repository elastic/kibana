/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { isRight } from 'fp-ts/lib/Either';
import {
  selectMonitorStatusAlert,
  overviewFiltersSelector,
  snapshotDataSelector,
  esKuerySelector,
  selectedFiltersSelector,
} from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';
import {
  fetchOverviewFilters,
  setSearchTextAction,
  setEsKueryString,
  getSnapshotCountAction,
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
        dateRangeStart: 'now-24h',
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

  const { count, loading } = useSelector(snapshotDataSelector);
  const esKuery = useSelector(esKuerySelector);
  const [esFilters] = useUpdateKueryString(
    indexPattern,
    alertParams.search,
    alertParams.filters === undefined || typeof alertParams.filters === 'string'
      ? ''
      : JSON.stringify(Array.from(Object.entries(alertParams.filters)))
  );
  useEffect(() => {
    dispatch(setEsKueryString(esFilters ?? ''));
  }, [dispatch, esFilters]);

  const isOldAlert = React.useMemo(
    () => !isRight(AtomicStatusCheckParamsType.decode(alertParams)),
    [alertParams]
  );
  useEffect(() => {
    dispatch(
      getSnapshotCountAction({ dateRangeStart: 'now-24h', dateRangeEnd: 'now', filters: esKuery })
    );
  }, [dispatch, esKuery]);

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

  const { pathname } = useLocation();
  const shouldUpdateUrl = useMemo(() => pathname.indexOf('app/uptime') !== -1, [pathname]);

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
      shouldUpdateUrl={shouldUpdateUrl}
      snapshotCount={count.total}
      snapshotLoading={loading}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
