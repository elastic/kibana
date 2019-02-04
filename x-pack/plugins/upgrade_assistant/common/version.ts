/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import pkg from '../../../package.json';

// Extract version information
const currentVersionNum = pkg.version as string;
const matches = currentVersionNum.match(/^([1-9]+)\.([0-9]+)\.([0-9]+)$/)!;

export const CURRENT_MAJOR_VERSION = matches[1];
export const NEXT_MAJOR_VERSION = (parseInt(CURRENT_MAJOR_VERSION, 10) + 1).toString();
export const PREV_MAJOR_VERSION = (parseInt(CURRENT_MAJOR_VERSION, 10) - 1).toString();
