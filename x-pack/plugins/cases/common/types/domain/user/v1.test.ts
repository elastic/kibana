/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { UserRt, UserWithProfileInfoRt, UsersRt, CaseUserProfileRt, CaseAssigneesRt } from './v1';

describe('User', () => {
  describe('UserRt', () => {
    const defaultRequest = {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
      profile_uid: 'profile-uid-1',
    };
    it('has expected attributes in request', () => {
      const query = UserRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('UserWithProfileInfoRt', () => {
    const defaultRequest = {
      uid: '1',
      avatar: {
        initials: 'SU',
        color: 'red',
        imageUrl: 'https://google.com/image1',
      },
      user: {
        username: 'user',
        email: 'some.user@google.com',
        full_name: 'Some Super User',
      },
    };

    it('has expected attributes in request', () => {
      const query = UserWithProfileInfoRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it.each(['initials', 'color', 'imageUrl'])('does not returns an error if %s is null', (key) => {
      const reqWithNullImage = set(defaultRequest, `avatar.${key}`, null);
      const query = UserWithProfileInfoRt.decode(reqWithNullImage);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: reqWithNullImage,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserWithProfileInfoRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from avatar', () => {
      const query = UserWithProfileInfoRt.decode({
        ...defaultRequest,
        avatar: { ...defaultRequest.avatar, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('UsersRt', () => {
    const defaultRequest = [
      {
        email: 'reporter_no_uid@elastic.co',
        full_name: 'Reporter No UID',
        username: 'reporter_no_uid',
        profile_uid: 'reporter-uid',
      },
      {
        full_name: 'elastic',
        email: 'testemail@elastic.co',
        username: 'elastic',
      },
    ];

    it('has expected attributes in request', () => {
      const query = UsersRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UsersRt.decode([
        {
          ...defaultRequest[0],
          foo: 'bar',
        },
      ]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [defaultRequest[0]],
      });
    });
  });

  describe('UserProfile', () => {
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

  describe('Assignee', () => {
    describe('CaseAssigneesRt', () => {
      const defaultRequest = [{ uid: '1' }, { uid: '2' }];

      it('has expected attributes in request', () => {
        const query = CaseAssigneesRt.decode(defaultRequest);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: defaultRequest,
        });
      });

      it('removes foo:bar attributes from request', () => {
        const query = CaseAssigneesRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: [defaultRequest[0]],
        });
      });

      it('removes foo:bar attributes from assignees', () => {
        const query = CaseAssigneesRt.decode([{ uid: '1', foo: 'bar' }, { uid: '2' }]);

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: [{ uid: '1' }, { uid: '2' }],
        });
      });
    });
  });
});
