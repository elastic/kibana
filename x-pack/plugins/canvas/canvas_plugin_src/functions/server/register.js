/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyFunctionStrings } from '../../strings';
import { functions } from './src/index';

const { register } = canvas;

// Apply localized strings to the Common Function specs, then register them.
applyFunctionStrings(functions).forEach(register);
