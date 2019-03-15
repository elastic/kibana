/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updater } from './layout';
import { multiply, rotateZ, translate } from './matrix';
import { createStore } from './store';

export const matrix = { multiply, rotateZ, translate };

export const createLayoutStore = (initialState, onChangeCallback) =>
  createStore(initialState, updater, onChangeCallback);
