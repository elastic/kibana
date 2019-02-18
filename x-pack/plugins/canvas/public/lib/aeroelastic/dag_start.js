/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { select } from './select';
import { getPrimaryUpdate, getScene } from './layout_functions';

export const state = d => d;
/**
 * Scenegraph update based on events, gestures...
 */

export const scene = select(getScene)(state);
export const primaryUpdate = select(getPrimaryUpdate)(state);
