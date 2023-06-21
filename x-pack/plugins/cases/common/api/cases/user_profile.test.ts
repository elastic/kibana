/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SuggestUserProfilesRequestRt, CaseUserProfileRt } from './user_profiles';

describe('userProfile', () => {
  describe('SuggestUserProfilesRequestRt', () => {
    const defaultRequest = {
      name: 'damaged_raccoon',
      owners: ['cases'],
      size: 5,
    };

    it('has expected attributes in request', () => {
      const query = SuggestUserProfilesRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          name: 'damaged_raccoon',
          owners: ['cases'],
          size: 5,
        },
      });
    });

    it('has only name and owner in request', () => {
      const query = SuggestUserProfilesRequestRt.decode({
        name: 'damaged_raccoon',
        owners: ['cases'],
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          name: 'damaged_raccoon',
          owners: ['cases'],
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SuggestUserProfilesRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          name: 'damaged_raccoon',
          owners: ['cases'],
          size: 5,
        },
      });
    });
  });

  describe('CaseUserProfileRt', () => {
    it('has expected attributes in response', () => {
      const query = CaseUserProfileRt.decode({
        uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
      });
    });

    it('removes foo:bar attributes from response', () => {
      const query = CaseUserProfileRt.decode({
        uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
      });
    });
  });
});
