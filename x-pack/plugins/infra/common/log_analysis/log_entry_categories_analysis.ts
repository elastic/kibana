/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const logEntryCategoriesJobTypeRT = rt.keyof({
  'log-entry-categories-count': null,
});

export type LogEntryCategoriesJobType = rt.TypeOf<typeof logEntryCategoriesJobTypeRT>;

export const logEntryCategoriesJobTypes: LogEntryCategoriesJobType[] = [
  'log-entry-categories-count',
];
