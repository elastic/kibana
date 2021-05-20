/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import { TGridModel } from '.';

import { TimelineState } from './types';

export const selectTGridById = (state: TimelineState, timelineId: string): TGridModel =>
  state.timelineById[timelineId];

export const getTGridByIdSelector = () => createSelector(selectTGridById, (timeline) => timeline);
