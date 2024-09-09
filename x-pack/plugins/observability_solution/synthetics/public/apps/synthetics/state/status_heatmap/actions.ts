/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { MonitorStatusHeatmapBucket } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

import { MonitorStatusHeatmapActionArgs } from './models';

export const getMonitorStatusHeatmapAction = createAsyncAction<
  MonitorStatusHeatmapActionArgs,
  MonitorStatusHeatmapBucket[]
>('MONITOR STATUS HEATMAP');

export const clearMonitorStatusHeatmapAction = createAction<void>('CLEAR MONITOR STATUS HEATMAP');

export const quietGetMonitorStatusHeatmapAction = createAsyncAction<
  MonitorStatusHeatmapActionArgs,
  MonitorStatusHeatmapBucket[]
>('QUIET GET MONITOR STATUS HEATMAP');
