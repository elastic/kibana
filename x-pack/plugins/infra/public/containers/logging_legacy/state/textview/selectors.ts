/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TextviewState } from './reducer';

export const selectTextviewScale = (state: TextviewState) => state.scale;

export const selectTextviewWrap = (state: TextviewState) => state.wrap;
