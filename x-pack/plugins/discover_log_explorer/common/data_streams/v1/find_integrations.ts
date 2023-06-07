/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { integrationRT } from '../types';
import { sortOrderRT } from './common';

const searchAfterRT = rt.array(rt.union([rt.number, rt.string]));

export const findIntegrationsResponseRT = rt.exact(
  rt.intersection([
    rt.type({
      items: rt.array(integrationRT),
      total: rt.number,
    }),
    rt.partial({
      searchAfter: searchAfterRT,
    }),
  ])
);

export const findIntegrationsRequestQueryRT = rt.exact(
  rt.partial({
    nameQuery: rt.string,
    perPage: rt.number,
    dataStreamType: rt.literal('logs'),
    searchAfter: searchAfterRT,
    sortOrder: sortOrderRT,
  })
);

export type SearchAfter = rt.TypeOf<typeof searchAfterRT>;
export type FindIntegrationsRequestQuery = rt.TypeOf<typeof findIntegrationsRequestQueryRT>;
export type FindIntegrationsResponse = rt.TypeOf<typeof findIntegrationsResponseRT>;
