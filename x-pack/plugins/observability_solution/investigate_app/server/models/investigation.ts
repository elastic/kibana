/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const investigationSchema = t.type({
  id: t.string,
  title: t.string,
  createdAt: t.number,
  createdBy: t.string,
  parameters: t.type({
    timeRange: t.type({ from: t.number, to: t.number }),
  }),
});

export type Investigation = t.TypeOf<typeof investigationSchema>;
export type StoredInvestigation = t.OutputOf<typeof investigationSchema>;
