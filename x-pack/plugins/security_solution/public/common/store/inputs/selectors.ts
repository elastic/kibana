/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';

import type { Filter, Query } from '@kbn/es-query';
import { State } from '../types';

import { InputsModel, InputsRange, GlobalQuery } from './model';

const selectInputs = (state: State): InputsModel => state.inputs;

const selectGlobal = (state: State): InputsRange => state.inputs.global;

const selectTimeline = (state: State): InputsRange => state.inputs.timeline;

const selectGlobalQuery = (state: State, id: string): GlobalQuery =>
  state.inputs.global.queries.find((q) => q.id === id) || {
    id: '',
    inspect: null,
    isInspected: false,
    loading: false,
    refetch: null,
    selectedInspectIndex: 0,
  };

const selectTimelineQuery = (state: State, id: string): GlobalQuery =>
  state.inputs.timeline.queries.find((q) => q.id === id) ||
  state.inputs.global.queries.find((q) => q.id === id) || {
    id: '',
    inspect: null,
    isInspected: false,
    loading: false,
    refetch: null,
    selectedInspectIndex: 0,
  };

export const inputsSelector = () => createSelector(selectInputs, (inputs) => inputs);

export const timelineTimeRangeSelector = createSelector(
  selectTimeline,
  (timeline) => timeline.timerange
);

export const globalFullScreenSelector = createSelector(selectGlobal, (global) => global.fullScreen);

export const timelineFullScreenSelector = createSelector(
  selectTimeline,
  (timeline) => timeline.fullScreen
);

export const globalTimeRangeSelector = createSelector(selectGlobal, (global) => global.timerange);

export const globalPolicySelector = createSelector(selectGlobal, (global) => global.policy);

export const globalQuery = () => createSelector(selectGlobal, (global) => global.queries);

export const globalQueryByIdSelector = () => createSelector(selectGlobalQuery, (query) => query);

export const timelineQueryByIdSelector = () =>
  createSelector(selectTimelineQuery, (query) => query);

export const globalSelector = () => createSelector(selectGlobal, (global) => global);

const DEFAULT_QUERY: Query = { query: '', language: 'kuery' };

export const globalQuerySelector = () =>
  createSelector(selectGlobal, (global) => global.query || DEFAULT_QUERY);

export const globalSavedQuerySelector = () =>
  createSelector(selectGlobal, (global) => global.savedQuery || null);

const NO_FILTERS: Filter[] = [];

export const globalFiltersQuerySelector = () =>
  createSelector(selectGlobal, (global) => global.filters || NO_FILTERS);

export const getTimelineSelector = () => createSelector(selectTimeline, (timeline) => timeline);

export const getTimelinePolicySelector = () =>
  createSelector(selectTimeline, (timeline) => timeline.policy);
