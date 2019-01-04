/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'babel-polyfill';
import { applyElementStrings } from '../strings';
import { elementSpecs } from './index';

const { i18n, register } = canvas;

applyElementStrings(elementSpecs, i18n).forEach(register);
