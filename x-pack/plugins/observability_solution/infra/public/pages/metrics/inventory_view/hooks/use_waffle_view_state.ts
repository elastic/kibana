/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { InventoryViewAttributes } from '../../../../../common/inventory_views';
import { useWaffleOptionsContext, DEFAULT_WAFFLE_OPTIONS_STATE } from './use_waffle_options';
import { useWaffleTimeContext, DEFAULT_WAFFLE_TIME_STATE } from './use_waffle_time';
import { useWaffleFiltersContext, DEFAULT_WAFFLE_FILTERS_STATE } from './use_waffle_filters';

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
      const attributes = newState.attributes;

      setWaffleOptionsState({
        sort: attributes.sort,
        metric: attributes.metric,
        groupBy: attributes.groupBy,
        nodeType: attributes.nodeType,
        view: attributes.view,
        customOptions: attributes.customOptions,
        customMetrics: attributes.customMetrics,
        boundsOverride: attributes.boundsOverride,
        autoBounds: attributes.autoBounds,
        accountId: attributes.accountId,
        region: attributes.region,
        legend: attributes.legend,
        timelineOpen: attributes.timelineOpen,
      });

      if (attributes.time) {
        setWaffleTimeState({
          currentTime: attributes.time,
          isAutoReloading: attributes.autoReload,
        });
      }
      setWaffleFiltersState(attributes.filterQuery);
    },
    [setWaffleOptionsState, setWaffleTimeState, setWaffleFiltersState]
  );

  return {
    viewState,
    defaultViewState: DEFAULT_WAFFLE_VIEW_STATE,
    onViewChange,
  };
};

export type WaffleViewState = Omit<
  InventoryViewAttributes,
  'name' | 'isDefault' | 'isStatic' | 'source'
>;
