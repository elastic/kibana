/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions as browserFns } from '../../canvas_plugin_src/functions/browser';
import { ExpressionFunction } from '../../../../../../src/plugins/expressions';

export const functionSpecs = browserFns.map(fn => new ExpressionFunction(fn()));
