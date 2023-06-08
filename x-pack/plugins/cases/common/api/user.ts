/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

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
      avatar: rt.exact(rt.partial({ initials: rt.string, color: rt.string, imageUrl: rt.string })),
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
