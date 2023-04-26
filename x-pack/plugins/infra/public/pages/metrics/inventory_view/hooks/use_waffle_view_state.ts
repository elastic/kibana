/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import {
  useWaffleOptionsContext,
  DEFAULT_WAFFLE_OPTIONS_STATE,
  WaffleOptionsState,
} from './use_waffle_options';
import { useWaffleTimeContext, DEFAULT_WAFFLE_TIME_STATE } from './use_waffle_time';
import {
  useWaffleFiltersContext,
  DEFAULT_WAFFLE_FILTERS_STATE,
  WaffleFiltersState,
} from './use_waffle_filters';

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
    timelineOpen,
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
    timelineOpen,
  };

  const onViewChange = useCallback(
    (newState: { attributes: WaffleViewState }) => {
      setWaffleOptionsState({
        sort: newState.attributes.sort,
        metric: newState.attributes.metric,
        groupBy: newState.attributes.groupBy,
        nodeType: newState.attributes.nodeType,
        view: newState.attributes.view,
        customOptions: newState.attributes.customOptions,
        customMetrics: newState.attributes.customMetrics,
        boundsOverride: newState.attributes.boundsOverride,
        autoBounds: newState.attributes.autoBounds,
        accountId: newState.attributes.accountId,
        region: newState.attributes.region,
        legend: newState.attributes.legend,
        timelineOpen: newState.attributes.timelineOpen,
      });

      if (newState.attributes.time) {
        setWaffleTimeState({
          currentTime: newState.attributes.time,
          isAutoReloading: newState.attributes.autoReload,
        });
      }
      setWaffleFiltersState(newState.attributes.filterQuery);
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
