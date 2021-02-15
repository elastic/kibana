/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import SemVer from 'semver/classes/semver';
import pkg from '../../../../package.json';

export const CURRENT_VERSION = new SemVer(pkg.version as string);
export const CURRENT_MAJOR_VERSION = CURRENT_VERSION.major;
export const NEXT_MAJOR_VERSION = CURRENT_VERSION.major + 1;
export const PREV_MAJOR_VERSION = CURRENT_VERSION.major - 1;
