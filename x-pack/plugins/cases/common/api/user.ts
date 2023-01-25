/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const UserRT = rt.intersection([
  rt.type({
    email: rt.union([rt.undefined, rt.null, rt.string]),
    full_name: rt.union([rt.undefined, rt.null, rt.string]),
    username: rt.union([rt.undefined, rt.null, rt.string]),
  }),
  rt.partial({ profile_uid: rt.string }),
]);

export const UsersRt = rt.array(UserRT);

export type User = rt.TypeOf<typeof UserRT>;

export const GetCaseUsersResponseRt = rt.type({
  participants: rt.array(UserRT),
  users: rt.array(rt.type({ uid: rt.string })),
});

export type GetCaseUsersResponse = rt.TypeOf<typeof GetCaseUsersResponseRt>;
