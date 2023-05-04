/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const SwimlaneFieldsRT = rt.type({
  caseId: rt.union([rt.string, rt.null]),
});

export enum SwimlaneConnectorType {
  All = 'all',
  Alerts = 'alerts',
  Cases = 'cases',
}

export type SwimlaneFieldsType = rt.TypeOf<typeof SwimlaneFieldsRT>;
