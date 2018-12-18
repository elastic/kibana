/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import { createGlobalTimeEpic } from './inputs';

export const createLocalEpic = <State>() => combineEpics(createGlobalTimeEpic<State>());
