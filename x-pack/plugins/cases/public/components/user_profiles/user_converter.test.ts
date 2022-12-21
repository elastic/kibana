/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { convertToUserInfo } from './user_converter';

describe('convertToUserInfo', () => {
  it('returns undefined when the username is an empty string and the profile uid is not defined', () => {
    expect(convertToUserInfo({ username: '', email: null, fullName: null })).toBeUndefined();
  });

  it('returns a key of 123 and empty user info when the username is an empty string and the profile uid is not found', () => {
    expect(
      convertToUserInfo({ username: '', profileUid: '123', email: null, fullName: null })
    ).toEqual({
      key: '123',
      userInfo: {},
    });
  });

  it('returns the profile uid as the key and full profile when the profile uid is found', () => {
    expect(
      convertToUserInfo(
        { profileUid: userProfiles[0].uid, email: null, fullName: null, username: null },
        userProfilesMap
      )
    ).toMatchInlineSnapshot(`
      Object {
        "key": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
        "userInfo": Object {
          "data": Object {},
          "enabled": true,
          "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
          "user": Object {
            "email": "damaged_raccoon@elastic.co",
            "full_name": "Damaged Raccoon",
            "username": "damaged_raccoon",
          },
        },
      }
    `);
  });

  it('returns the username as the key and the user info using the existing elastic user information', () => {
    expect(convertToUserInfo({ username: 'sam', fullName: 'Sam Smith', email: 'sam@sam.com' }))
      .toMatchInlineSnapshot(`
      Object {
        "key": "sam",
        "userInfo": Object {
          "user": Object {
            "email": "sam@sam.com",
            "full_name": "Sam Smith",
            "username": "sam",
          },
        },
      }
    `);
  });

  it('returns the username as the key and the user info using the existing elastic user information when the profile uid is not found', () => {
    expect(
      convertToUserInfo({
        username: 'sam',
        fullName: 'Sam Smith',
        email: 'sam@sam.com',
        profileUid: '123',
      })
    ).toMatchInlineSnapshot(`
      Object {
        "key": "sam",
        "userInfo": Object {
          "user": Object {
            "email": "sam@sam.com",
            "full_name": "Sam Smith",
            "username": "sam",
          },
        },
      }
    `);
  });
});
