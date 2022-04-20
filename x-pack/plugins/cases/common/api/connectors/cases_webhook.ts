/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

// New fields should also be added at: x-pack/plugins/cases/server/connectors/case/schema.ts
export const CasesWebhookFieldsRT = rt.record(
  rt.string,
  rt.union([rt.string, rt.array(rt.string), rt.undefined, rt.null])
);

export type CasesWebhookFieldsType = rt.TypeOf<typeof CasesWebhookFieldsRT>;
