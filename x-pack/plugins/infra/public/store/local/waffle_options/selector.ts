/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WaffleOptionsState } from './reducer';

export const selectMetric = (state: WaffleOptionsState) => state.metric;
export const selectGroupBy = (state: WaffleOptionsState) => state.groupBy;
export const selectNodeType = (state: WaffleOptionsState) => state.nodeType;
