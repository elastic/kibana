/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ActionsRt, ActionTypes } from '../common';

const AdditionalFilterTypes = {
  action: 'action',
  alert: 'alert',
  user: 'user',
  attachment: 'attachment',
};

export const FindTypes = {
  ...ActionTypes,
  ...AdditionalFilterTypes,
} as const;

const FindTypeFieldRt = rt.keyof(FindTypes);

export const UserActionFindRequestRt = rt.intersection([
  rt.type({
    action: ActionsRt,
    type: FindTypeFieldRt,
    sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
  }),
  rt.partial({ searchAfter: rt.array(rt.string), perPage: rt.number }),
]);

export type UserActionFindRequest = rt.TypeOf<typeof UserActionFindRequestRt>;
