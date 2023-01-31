/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseUserActionsResponseRt } from '../response';
import { ActionTypes } from '../common';
import { NumberFromString } from '../../../saved_object';

const AdditionalFilterTypes = {
  action: 'action',
  alert: 'alert',
  user: 'user',
  attachment: 'attachment',
} as const;

export const FindTypes = {
  ...ActionTypes,
  ...AdditionalFilterTypes,
} as const;

const FindTypeFieldRt = rt.keyof(FindTypes);

export type FindTypeField = rt.TypeOf<typeof FindTypeFieldRt>;

export const UserActionFindRequestRt = rt.partial({
  types: rt.array(FindTypeFieldRt),
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
  page: NumberFromString,
  perPage: NumberFromString,
});

export type UserActionFindRequest = rt.TypeOf<typeof UserActionFindRequestRt>;

export const UserActionFindResponseRt = rt.type({
  userActions: CaseUserActionsResponseRt,
  page: rt.number,
  perPage: rt.number,
  total: rt.number,
});

export type UserActionFindResponse = rt.TypeOf<typeof UserActionFindResponseRt>;
