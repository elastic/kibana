/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { WaffleFiltersState } from './use_waffle_filters';
import { DEFAULT_WAFFLE_FILTERS_STATE, useWaffleFiltersContext } from './use_waffle_filters';
import type { WaffleOptionsState } from './use_waffle_options';
import { DEFAULT_WAFFLE_OPTIONS_STATE, useWaffleOptionsContext } from './use_waffle_options';
import { DEFAULT_WAFFLE_TIME_STATE, useWaffleTimeContext } from './use_waffle_time';

export const DEFAULT_WAFFLE_VIEW_STATE: WaffleViewState = {
  ...DEFAULT_WAFFLE_OPTIONS_STATE,
  filterQuery: DEFAULT_WAFFLE_FILTERS_STATE,
  time: DEFAULT_WAFFLE_TIME_STATE.currentTime,
  autoReload: DEFAULT_WAFFLE_TIME_STATE.isAutoReloading,
};

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
    legend,
    sort,
    setWaffleOptionsState,
  } = useWaffleOptionsContext();
  const { currentTime, isAutoReloading, setWaffleTimeState } = useWaffleTimeContext();
  const { filterQuery, setWaffleFiltersState } = useWaffleFiltersContext();

  const viewState: WaffleViewState = {
    metric,
    sort,
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
    legend,
  };

  const onViewChange = useCallback(
    (newState: WaffleViewState) => {
      setWaffleOptionsState({
        sort: newState.sort,
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
        legend: newState.legend,
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
    defaultViewState: DEFAULT_WAFFLE_VIEW_STATE,
    onViewChange,
  };
};

export type WaffleViewState = WaffleOptionsState & {
  time: number;
  autoReload: boolean;
  filterQuery: WaffleFiltersState;
};
