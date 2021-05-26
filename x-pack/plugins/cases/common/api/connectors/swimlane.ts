/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

// New fields should also be added at: x-pack/plugins/cases/server/connectors/case/schema.ts
export const SwimlaneFieldsRT = rt.type({
  caseId: rt.union([rt.string, rt.null]),
  caseName: rt.union([rt.string, rt.null]),
});

export type SwimlaneFieldsType = rt.TypeOf<typeof SwimlaneFieldsRT>;
