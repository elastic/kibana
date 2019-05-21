/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { State } from '../reducer';

import { InputsModel, InputsRange } from './model';

const selectInputs = (state: State): InputsModel => state.inputs;

const selectGlobal = (state: State): InputsRange => state.inputs.global;

const selectTimeline = (state: State): InputsRange => state.inputs.timeline;

export const inpustSelector = createSelector(
  selectInputs,
  inputs => inputs
);

export const globalTimeRangeSelector = createSelector(
  selectGlobal,
  global => global.timerange
);

export const globalPolicySelector = createSelector(
  selectGlobal,
  global => global.policy
);

export const globalQuery = createSelector(
  selectGlobal,
  global => global.query
);

export const globalSelector = () =>
  createSelector(
    selectGlobal,
    global => global
  );

export const getTimelineSelector = () =>
  createSelector(
    selectTimeline,
    timeline => timeline
  );
