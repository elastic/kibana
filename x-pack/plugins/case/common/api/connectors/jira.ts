/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const JiraFieldsRT = rt.type({
  issueType: rt.union([rt.string, rt.null]),
  priority: rt.union([rt.string, rt.null]),
  parent: rt.union([rt.string, rt.null]),
});

export type JiraFieldsType = rt.TypeOf<typeof JiraFieldsRT>;
