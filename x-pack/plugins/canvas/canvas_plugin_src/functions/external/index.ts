/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedLens } from './saved_lens';
import { savedMap } from './saved_map';
import { savedVisualization } from './saved_visualization';
// TODO: elastic/kibana#44822 Disabling pending filters work
// import { savedSearch } from './saved_search';

export const functions = [savedLens, savedMap, savedVisualization];
