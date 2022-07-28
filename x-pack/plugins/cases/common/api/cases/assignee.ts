/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const CaseUserProfileRt = rt.type({
  uid: rt.string,
});

export const CaseAssigneesRt = rt.array(CaseUserProfileRt);

export type CaseUserProfile = rt.TypeOf<typeof CaseUserProfileRt>;
export type CaseAssignees = rt.TypeOf<typeof CaseAssigneesRt>;
