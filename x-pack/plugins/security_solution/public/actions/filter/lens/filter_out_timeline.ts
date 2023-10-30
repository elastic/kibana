/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAppStore } from '../../../common/store';

import type { StartServices } from '../../../types';
import { createLensFilterLegendAction } from './helpers';

export const ACTION_ID_TIMELINE_TOP_N_FILTER_OUT = 'timeline_topN_filterOut';

export const createFilterOutTopNTimelineLegendAction = ({
  store,
  order,
  services,
}: {
  store: SecurityAppStore;
  order: number;
  services: StartServices;
}) =>
  createLensFilterLegendAction({
    id: ACTION_ID_TIMELINE_TOP_N_FILTER_OUT,
    order,
    store,
    services,
    negate: true,
  });
