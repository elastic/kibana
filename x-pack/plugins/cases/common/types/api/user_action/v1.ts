/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { paginationSchema } from '../../../schema';
import { MAX_USER_ACTIONS_PER_PAGE } from '../../../constants';
import { ActionTypes } from '../../domain/user_action/action/v1';
import {
  CaseUserActionInjectedDeprecatedIdsRt,
  CaseUserActionBasicRt,
  UserActionsRt,
} from '../../domain/user_action/v1';

/**
 * User actions stats API
 */
export const CaseUserActionStatsRt = rt.strict({
  total: rt.number,
  total_comments: rt.number,
  total_other_actions: rt.number,
});

export type CaseUserActionStatsResponse = rt.TypeOf<typeof CaseUserActionStatsRt>;
export const CaseUserActionStatsResponseRt = CaseUserActionStatsRt;

/**
 * Deprecated APIs
 */
export const CaseUserActionDeprecatedResponseRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionInjectedDeprecatedIdsRt,
]);
export const CaseUserActionsDeprecatedResponseRt = rt.array(CaseUserActionDeprecatedResponseRt);
export type CaseUserActionsDeprecatedResponse = rt.TypeOf<
  typeof CaseUserActionsDeprecatedResponseRt
>;

export type CaseUserActionDeprecatedResponse = rt.TypeOf<typeof CaseUserActionDeprecatedResponseRt>;

/**
 * Find User Actions API
 */

const AdditionalFilterTypes = {
  action: 'action',
  alert: 'alert',
  user: 'user',
  attachment: 'attachment',
} as const;

const FindTypes = {
  ...ActionTypes,
  ...AdditionalFilterTypes,
} as const;

const FindTypeFieldRt = rt.keyof(FindTypes);

export type FindTypeField = rt.TypeOf<typeof FindTypeFieldRt>;

export const UserActionFindRequestRt = rt.intersection([
  rt.exact(
    rt.partial({
      types: rt.array(FindTypeFieldRt),
      sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
    })
  ),
  paginationSchema({ maxPerPage: MAX_USER_ACTIONS_PER_PAGE }),
]);

export type UserActionFindRequest = rt.TypeOf<typeof UserActionFindRequestRt>;

export const UserActionFindResponseRt = rt.strict({
  userActions: UserActionsRt,
  page: rt.number,
  perPage: rt.number,
  total: rt.number,
});

export type UserActionFindResponse = rt.TypeOf<typeof UserActionFindResponseRt>;
