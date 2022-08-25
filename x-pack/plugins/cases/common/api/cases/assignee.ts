/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserProfileRt } from './user_profiles';

export const CaseAssigneesRt = rt.array(CaseUserProfileRt);

export type CaseAssignees = rt.TypeOf<typeof CaseAssigneesRt>;

export const FindAssigneesRequestRt = rt.intersection([
  rt.type({
    searchTerm: rt.string,
    owners: rt.union([rt.array(rt.string), rt.string]),
  }),
  rt.partial({
    size: rt.number,
  }),
]);

export type FindAssigneesRequest = rt.TypeOf<typeof FindAssigneesRequestRt>;
