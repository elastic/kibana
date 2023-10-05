/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyStringArray } from '@kbn/securitysolution-io-ts-types';

export const getUserProfilesRequestQuery = t.exact(
  t.partial({
    userIds: NonEmptyStringArray,
  })
);

export type GetUserProfilesRequestQuery = t.TypeOf<typeof getUserProfilesRequestQuery>;
export type GetUserProfilesRequestQueryDecoded = GetUserProfilesRequestQuery;
