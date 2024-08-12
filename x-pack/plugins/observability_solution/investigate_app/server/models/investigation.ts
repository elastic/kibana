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
  params: t.type({
    timeRange: t.type({ from: t.number, to: t.number }),
  }),
  origin: t.type({
    type: t.union([t.literal('alert'), t.literal('blank')]),
    id: t.string,
  }),
  status: t.union([t.literal('ongoing'), t.literal('closed')]),
});

export type Investigation = t.TypeOf<typeof investigationSchema>;
export type StoredInvestigation = t.OutputOf<typeof investigationSchema>;
