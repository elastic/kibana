/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const ResilientFieldsRT = rt.type({
  incidentTypes: rt.union([rt.array(rt.number), rt.null]),
  severityCode: rt.union([rt.number, rt.null]),
});

export type ResilientFieldsType = rt.TypeOf<typeof ResilientFieldsRT>;
export type ResilientESFieldsType =
  | { key: 'incidentTypes'; value: number[] | null }
  | { key: 'severityCode'; value: number | null };
