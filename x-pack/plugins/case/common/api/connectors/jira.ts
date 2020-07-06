/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const JiraFieldsRT = rt.union([
  rt.literal('summary'),
  rt.literal('description'),
  rt.literal('comments'),
]);

export type JiraFieldsType = rt.TypeOf<typeof JiraFieldsRT>;
