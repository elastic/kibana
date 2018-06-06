/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduxBootstrap } from '../util';

const actionDefs = { SHOW_CHARTS: (d) => d };

const { actions, reducer } = reduxBootstrap({ defaultState: true, actionDefs });

export const showChartsActions = actions;
export const showChartsReducer = reducer;
