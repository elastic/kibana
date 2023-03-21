/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/security-plugin/common';

export const userProfiles: UserProfile[] = [
  {
    uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
    enabled: true,
    data: {},
    user: {
      username: 'damaged_raccoon',
      email: 'damaged_raccoon@elastic.co',
      full_name: 'Damaged Raccoon',
    },
  },
  {
    uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
    enabled: true,
    data: {},
    user: {
      username: 'physical_dinosaur',
      email: 'physical_dinosaur@elastic.co',
      full_name: 'Physical Dinosaur',
    },
  },
  {
    uid: 'u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0',
    enabled: true,
    data: {},
    user: {
      username: 'wet_dingo',
      email: 'wet_dingo@elastic.co',
      full_name: 'Wet Dingo',
    },
  },
];

export const userProfilesIds = userProfiles.map((profile) => profile.uid);
export const userProfilesMap = new Map<string, UserProfile>(
  userProfiles.map((profile) => [profile.uid, profile])
);
