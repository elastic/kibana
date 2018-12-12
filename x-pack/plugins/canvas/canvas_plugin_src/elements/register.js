/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'babel-polyfill';

import { applyElementStrings } from '../strings';
import { elementSpecs } from './index';

const { register } = canvas;

// Apply localized strings to the Element specs, then register them.
applyElementStrings(elementSpecs).forEach(register);
