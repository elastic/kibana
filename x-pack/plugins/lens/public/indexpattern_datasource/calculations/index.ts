/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { derivativeFunction } from './derivative_fn';
import { timescaleFunction } from './time_scale_fn';

export const calculationFunctions = [derivativeFunction, timescaleFunction];
