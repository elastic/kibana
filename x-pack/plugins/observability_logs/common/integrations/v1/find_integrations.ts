/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { integrationRT } from '../types';

const pageAfterRT = rt.array(rt.union([rt.number, rt.string]));

const sortDirectionRT = rt.union([rt.literal('asc'), rt.literal('desc')]);

export const findIntegrationsResponseRT = rt.exact(
  rt.intersection([
    rt.type({
      items: rt.array(integrationRT),
      total: rt.number,
    }),
    rt.partial({
      pageAfter: pageAfterRT,
    }),
  ])
);

export const findIntegrationsRequestQueryRT = rt.partial({
  nameQuery: rt.string,
  pageSize: rt.number,
  type: rt.literal('log'),
  pageAfter: pageAfterRT,
  sortDirection: sortDirectionRT,
});

export type PageAfter = rt.TypeOf<typeof pageAfterRT>;
export type FindIntegrationsRequestQuery = rt.TypeOf<typeof findIntegrationsRequestQueryRT>;
export type FindIntegrationsResponse = rt.TypeOf<typeof findIntegrationsResponseRT>;
