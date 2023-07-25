/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { MAX_SUGGESTED_PROFILES } from '../../constants';
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

    it('missing size parameter works correctly', () => {
      const query = SuggestUserProfilesRequestRt.decode({
        name: 'di maria',
        owners: ['benfica'],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: {
          name: 'di maria',
          owners: ['benfica'],
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

    it(`does not accept size param bigger than ${MAX_SUGGESTED_PROFILES}`, () => {
      const query = SuggestUserProfilesRequestRt.decode({
        ...defaultRequest,
        size: MAX_SUGGESTED_PROFILES + 1,
      });

      expect(PathReporter.report(query)).toContain('The size field cannot be more than 10.');
    });

    it('does not accept size param lower than 1', () => {
      const query = SuggestUserProfilesRequestRt.decode({
        ...defaultRequest,
        size: 0,
      });

      expect(PathReporter.report(query)).toContain('The size field cannot be less than 1.');
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
