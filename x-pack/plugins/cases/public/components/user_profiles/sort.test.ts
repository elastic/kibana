/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfiles } from '../../containers/user_profiles/api.mock';
import {
  bringCurrentUserToFrontAndSort,
  moveCurrentUserToBeginning,
  orderAssigneesIncludingNone,
} from './sort';

describe('sort', () => {
  describe('moveCurrentUserToBeginning', () => {
    it('returns an empty array if no profiles are provided', () => {
      expect(moveCurrentUserToBeginning()).toBeUndefined();
    });

    it("returns the profiles if the current profile isn't provided", () => {
      const profiles = [{ uid: '1' }];
      expect(moveCurrentUserToBeginning(undefined, profiles)).toEqual(profiles);
    });

    it("returns the profiles if the current profile isn't found", () => {
      const profiles = [{ uid: '1' }];
      expect(moveCurrentUserToBeginning({ uid: '2' }, profiles)).toEqual(profiles);
    });

    it('moves the current profile to the front', () => {
      const profiles = [{ uid: '1' }, { uid: '2' }];
      expect(moveCurrentUserToBeginning({ uid: '2' }, profiles)).toEqual([
        { uid: '2' },
        { uid: '1' },
      ]);
    });
  });

  describe('bringCurrentUserToFrontAndSort', () => {
    const unsortedProfiles = [...userProfiles].reverse();

    it('returns a sorted list of users when the current user is undefined', () => {
      expect(bringCurrentUserToFrontAndSort(undefined, unsortedProfiles)).toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "damaged_raccoon@elastic.co",
              "full_name": "Damaged Raccoon",
              "username": "damaged_raccoon",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "physical_dinosaur@elastic.co",
              "full_name": "Physical Dinosaur",
              "username": "physical_dinosaur",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
        ]
      `);
    });

    it('returns a sorted list of users with the current user at the beginning', () => {
      expect(bringCurrentUserToFrontAndSort(userProfiles[2], unsortedProfiles))
        .toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "damaged_raccoon@elastic.co",
              "full_name": "Damaged Raccoon",
              "username": "damaged_raccoon",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "physical_dinosaur@elastic.co",
              "full_name": "Physical Dinosaur",
              "username": "physical_dinosaur",
            },
          },
        ]
      `);
    });

    it('returns undefined if profiles is undefined', () => {
      expect(bringCurrentUserToFrontAndSort(userProfiles[2], undefined)).toBeUndefined();
    });
  });

  describe('orderAssigneesIncludingNone', () => {
    it('returns a sorted list of users with null', () => {
      const unsortedProfiles = [...userProfiles].reverse();

      expect(orderAssigneesIncludingNone(userProfiles[0], [null, ...unsortedProfiles]))
        .toMatchInlineSnapshot(`
        Array [
          null,
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "damaged_raccoon@elastic.co",
              "full_name": "Damaged Raccoon",
              "username": "damaged_raccoon",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "physical_dinosaur@elastic.co",
              "full_name": "Physical Dinosaur",
              "username": "physical_dinosaur",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
        ]
      `);
    });

    it('returns a sorted list of users without null', () => {
      const unsortedProfiles = [...userProfiles].reverse();

      expect(orderAssigneesIncludingNone(userProfiles[0], unsortedProfiles)).toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "damaged_raccoon@elastic.co",
              "full_name": "Damaged Raccoon",
              "username": "damaged_raccoon",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "physical_dinosaur@elastic.co",
              "full_name": "Physical Dinosaur",
              "username": "physical_dinosaur",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
        ]
      `);
    });

    it('adds null in the front', () => {
      const unsortedProfiles = [...userProfiles].reverse();

      expect(orderAssigneesIncludingNone(userProfiles[0], [...unsortedProfiles, null]))
        .toMatchInlineSnapshot(`
        Array [
          null,
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
            "user": Object {
              "email": "damaged_raccoon@elastic.co",
              "full_name": "Damaged Raccoon",
              "username": "damaged_raccoon",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            "user": Object {
              "email": "physical_dinosaur@elastic.co",
              "full_name": "Physical Dinosaur",
              "username": "physical_dinosaur",
            },
          },
          Object {
            "data": Object {},
            "enabled": true,
            "uid": "u_9xDEQqUqoYCnFnPPLq5mIRHKL8gBTo_NiKgOnd5gGk0_0",
            "user": Object {
              "email": "wet_dingo@elastic.co",
              "full_name": "Wet Dingo",
              "username": "wet_dingo",
            },
          },
        ]
      `);
    });
  });
});
