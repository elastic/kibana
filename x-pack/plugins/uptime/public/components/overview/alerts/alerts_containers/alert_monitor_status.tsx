/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { isRight } from 'fp-ts/lib/Either';
import {
  selectMonitorStatusAlert,
  snapshotDataSelector,
  esKuerySelector,
  uiSelector,
} from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';
import {
  setSearchTextAction,
  setEsKueryString,
  getSnapshotCountAction,
  setUiState,
} from '../../../../state/actions';
import { AtomicStatusCheckParamsType } from '../../../../../common/runtime_types';
import { useIndexPattern } from '../../kuery_bar/use_index_pattern';
import { useUpdateKueryString } from '../../../../hooks';
import { useOverviewFilters } from '../../../../hooks/use_overview_filters';
import { useSelectedFilters } from '../../../../hooks/use_selected_filters';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';

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
  const [selectedFilters, updateSelectedFilters] = useSelectedFilters();
  const ui = useSelector(uiSelector);

  useEffect(() => {
    if (alertParams.filters && typeof alertParams.filters !== 'string') {
      updateSelectedFilters({
        'observer.geo.name': alertParams.filters?.['observer.geo.name'] ?? [],
        'url.port': alertParams.filters?.['url.port'] ?? [],
        tags: alertParams.filters?.tags ?? [],
        'monitor.type': alertParams.filters?.['monitor.type'] ?? [],
      });
    }
    if (alertParams.search) {
      dispatch(setSearchTextAction(alertParams.search));
    }
    // this effect should only run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAlertParams('filters', selectedFilters);
  }, [setAlertParams, selectedFilters]);

  useEffect(() => {
    setAlertParams('search', ui.searchText);
  }, [setAlertParams, ui.searchText]);

  const overviewFilters = useOverviewFilters();
  const { locations } = useSelector(selectMonitorStatusAlert);

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
  const {
    services: {
      application: { currentAppId$ },
    },
  } = useKibana();

  const [currentApp, setCurrentApp] = useState<string>();
  useEffect(() => {
    const subscription = currentAppId$.subscribe(setCurrentApp);
    return () => subscription.unsubscribe();
  }, [currentAppId$, setCurrentApp]);

  useEffect(() => {
    if (currentApp !== 'uptime') {
      dispatch(setUiState({ dateRange: { from: 'now-24h', to: 'now' } }));
    }
  }, [dispatch, currentApp]);
  useEffect(() => {
    if (currentApp !== 'uptime') {
      dispatch(
        getSnapshotCountAction({
          dateRangeStart: ui.dateRange.from,
          dateRangeEnd: ui.dateRange.to,
          filters: esKuery,
        })
      );
    }
  }, [currentApp, dispatch, esKuery, ui.dateRange.from, ui.dateRange.to]);

  return (
    <AlertMonitorStatusComponent
      alertParams={alertParams}
      autocomplete={autocomplete}
      enabled={enabled}
      hasFilters={!!overviewFilters?.filters}
      isOldAlert={isOldAlert}
      locations={locations}
      numTimes={numTimes}
      selectedFilters={selectedFilters}
      setAlertParams={setAlertParams}
      snapshotCount={count.total}
      snapshotLoading={loading}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
