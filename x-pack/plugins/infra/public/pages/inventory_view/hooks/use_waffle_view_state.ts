/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback } from 'react';
import {
  useWaffleOptions,
  DEFAULT_WAFFLE_OPTIONS_STATE,
  WaffleOptionsState,
} from './use_waffle_options';
import { useWaffleTime, DEFAULT_WAFFLE_TIME_STATE } from './use_waffle_time';
import {
  useWaffleFilters,
  DEFAULT_WAFFLE_FILTERS_STATE,
  WaffleFiltersState,
} from './use_waffle_filters';

export const useWaffleViewState = () => {
  const {
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    customMetrics,
    boundsOverride,
    autoBounds,
    accountId,
    region,
    setWaffleOptionsState,
  } = useWaffleOptions();
  const { currentTime, isAutoReloading, setWaffleTimeState } = useWaffleTime();
  const { filterQuery, setWaffleFiltersState } = useWaffleFilters();

  const viewState: WaffleViewState = {
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
    customMetrics,
    boundsOverride,
    autoBounds,
    accountId,
    region,
    time: currentTime,
    autoReload: isAutoReloading,
    filterQuery,
  };

  const defaultViewState: WaffleViewState = {
    ...DEFAULT_WAFFLE_OPTIONS_STATE,
    filterQuery: DEFAULT_WAFFLE_FILTERS_STATE,
    time: DEFAULT_WAFFLE_TIME_STATE.currentTime,
    autoReload: DEFAULT_WAFFLE_TIME_STATE.isAutoReloading,
  };

  const onViewChange = useCallback(
    (newState: WaffleViewState) => {
      setWaffleOptionsState({
        metric: newState.metric,
        groupBy: newState.groupBy,
        nodeType: newState.nodeType,
        view: newState.view,
        customOptions: newState.customOptions,
        customMetrics: newState.customMetrics,
        boundsOverride: newState.boundsOverride,
        autoBounds: newState.autoBounds,
        accountId: newState.accountId,
        region: newState.region,
      });
      if (newState.time) {
        setWaffleTimeState({
          currentTime: newState.time,
          isAutoReloading: newState.autoReload,
        });
      }
      setWaffleFiltersState(newState.filterQuery);
    },
    [setWaffleOptionsState, setWaffleTimeState, setWaffleFiltersState]
  );

  return {
    viewState,
    defaultViewState,
    onViewChange,
  };
};

export type WaffleViewState = WaffleOptionsState & {
  time: number;
  autoReload: boolean;
  filterQuery: WaffleFiltersState;
};
