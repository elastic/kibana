/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { matrixToCSS } from './dom';
import { nextScene } from './layout';
import { primaryUpdate } from './layout_functions';
import { multiply, rotateZ, translate } from './matrix';
import { createStore, select } from './select';

export const layout = { nextScene, primaryUpdate };
export const matrix = { multiply, rotateZ, translate };
export const state = { createStore, select };
export const toCSS = matrixToCSS;
