/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: This should be merged in with hosts (folder for stage 2 refactor)

import { createSelector } from 'reselect';

import { State } from '../../reducer';

const uncommonProcessesPaginationLimit = (state: State): number =>
  state.local.uncommonProcesses.limit;

const uncommonProcessesPaginationUpperLimit = (state: State): number =>
  state.local.uncommonProcesses.upperLimit;

export const uncommonProcessesSelector = createSelector(
  uncommonProcessesPaginationLimit,
  uncommonProcessesPaginationUpperLimit,
  (limit, upperLimit) => ({ limit, upperLimit })
);
