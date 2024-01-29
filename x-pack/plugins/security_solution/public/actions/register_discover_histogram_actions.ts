/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterAction } from '@kbn/unified-search-plugin/public';
import type { History } from 'history';
import type { SecurityAppStore } from '../common/store';
import type { StartServices } from '../types';
import { EsqlInTimelineTrigger, EsqlInTimelineAction } from './constants';

const createDiscoverHistogramCustomFilterAction = (
  store: SecurityAppStore,
  history: History,
  services: StartServices
) => {
  const histogramApplyFilter = createFilterAction(
    services.customDataService.query.filterManager,
    services.customDataService.query.timefilter.timefilter,
    services.theme,
    EsqlInTimelineAction.VIS_FILTER_ACTION,
    EsqlInTimelineAction.VIS_FILTER_ACTION
  );
  services.uiActions.registerAction(histogramApplyFilter);

  return histogramApplyFilter;
};

const createDiscoverHistogramCustomTrigger = (
  store: SecurityAppStore,
  history: History,
  services: StartServices
) => {
  services.uiActions.registerTrigger({
    id: EsqlInTimelineTrigger.HISTOGRAM_TRIGGER,
  });
};

export const registerDiscoverHistogramActions = (
  store: SecurityAppStore,
  history: History,
  services: StartServices
) => {
  createDiscoverHistogramCustomTrigger(store, history, services);

  const histogramApplyFilter = createDiscoverHistogramCustomFilterAction(store, history, services);

  services.uiActions.attachAction(EsqlInTimelineTrigger.HISTOGRAM_TRIGGER, histogramApplyFilter.id);
};
