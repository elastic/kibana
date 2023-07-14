/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_SUGGESTED_PROFILES } from '../constants';
import { limitedNumberSchema } from '../schema';

const UserWithoutProfileUidRt = rt.strict({
  email: rt.union([rt.undefined, rt.null, rt.string]),
  full_name: rt.union([rt.undefined, rt.null, rt.string]),
  username: rt.union([rt.undefined, rt.null, rt.string]),
});

export const UserRt = rt.intersection([
  UserWithoutProfileUidRt,
  rt.exact(rt.partial({ profile_uid: rt.string })),
]);

export const UserWithProfileInfoRt = rt.intersection([
  rt.strict({
    user: UserWithoutProfileUidRt,
  }),
  rt.exact(rt.partial({ uid: rt.string })),
  rt.exact(
    rt.partial({
      avatar: rt.exact(
        rt.partial({
          initials: rt.union([rt.string, rt.null]),
          color: rt.union([rt.string, rt.null]),
          imageUrl: rt.union([rt.string, rt.null]),
        })
      ),
    })
  ),
]);

export const UsersRt = rt.array(UserRt);

export type User = rt.TypeOf<typeof UserRt>;
export type UserWithProfileInfo = rt.TypeOf<typeof UserWithProfileInfoRt>;

export const GetCaseUsersResponseRt = rt.strict({
  assignees: rt.array(UserWithProfileInfoRt),
  unassignedUsers: rt.array(UserWithProfileInfoRt),
  participants: rt.array(UserWithProfileInfoRt),
  reporter: UserWithProfileInfoRt,
});

export type GetCaseUsersResponse = rt.TypeOf<typeof GetCaseUsersResponseRt>;

/**
 * User Profiles
 */

export const SuggestUserProfilesRequestRt = rt.intersection([
  rt.strict({
    name: rt.string,
    owners: rt.array(rt.string),
  }),
  rt.exact(
    rt.partial({
      size: limitedNumberSchema({ fieldName: 'size', min: 1, max: MAX_SUGGESTED_PROFILES }),
    })
  ),
]);

export type SuggestUserProfilesRequest = rt.TypeOf<typeof SuggestUserProfilesRequestRt>;

export const CaseUserProfileRt = rt.strict({
  uid: rt.string,
});

export type CaseUserProfile = rt.TypeOf<typeof CaseUserProfileRt>;

/**
 * Assignees
 */

export const CaseAssigneesRt = rt.array(CaseUserProfileRt);
export type CaseAssignees = rt.TypeOf<typeof CaseAssigneesRt>;
