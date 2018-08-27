/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import { createLogEntriesEpic } from './log_entries';
import { createLogSummaryEpic } from './log_summary';
import { createSourceEpic } from './source';

export const createRemoteEpic = <State>() =>
  combineEpics(
    createLogEntriesEpic<State>(),
    createLogSummaryEpic<State>(),
    createSourceEpic<State>()
  );
