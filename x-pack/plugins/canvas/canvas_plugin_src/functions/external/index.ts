/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedLens } from './saved_lens';
import { savedMap } from './saved_map';
import { savedSearch } from './saved_search';
import { savedVisualization } from './saved_visualization';

export const functions = [savedLens, savedMap, savedSearch, savedVisualization];
