/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store';

import type { StartServices } from '../../../types';
import { createHistogramFilterLegendActionFactory } from './helpers';

export const TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_OUT = 'timelineHistogramLegendActionFilterOut';

export const createTimelineHistogramFilterOutLegendActionFactory = ({
  store,
  order,
  services,
}: {
  store: SecurityAppStore;
  order: number;
  services: StartServices;
}) =>
  createHistogramFilterLegendActionFactory({
    id: TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_OUT,
    order,
    store,
    services,
    negate: true,
  });
