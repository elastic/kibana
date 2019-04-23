/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathTypes } from '../common/types';

export const ROOT = '/';
export const SETUP = '/setup-guide';
const pathTypes = `:pathType(${PathTypes.blob}|${PathTypes.tree}|${PathTypes.blame}|${
  PathTypes.commits
})`;
export const MAIN = `/:resource/:org/:repo/${pathTypes}/:revision/:path*:goto(!.*)?`;
export const DIFF = '/:resource/:org/:repo/commit/:commitId';
export const REPO = `/:resource/:org/:repo`;
export const MAIN_ROOT = `/:resource/:org/:repo/${pathTypes}/:revision`;
export const ADMIN = '/admin';
export const SEARCH = '/search';
