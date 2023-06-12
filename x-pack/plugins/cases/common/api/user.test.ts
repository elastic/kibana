/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { UserRt, UserWithProfileInfoRt, UsersRt, GetCaseUsersResponseRt } from './user';

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

  describe('GetCaseUsersResponseRt', () => {
    const defaultRequest = {
      assignees: [
        {
          user: {
            email: null,
            full_name: null,
            username: null,
          },
          uid: 'u_62h24XVQzG4-MuH1-DqPmookrJY23aRa9h4fyULR6I8_0',
        },
        {
          user: {
            email: null,
            full_name: null,
            username: 'elastic',
          },
          uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
        },
      ],
      unassignedUsers: [
        {
          user: {
            email: '',
            full_name: '',
            username: 'cases_no_connectors',
          },
          uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0',
        },
        {
          user: {
            email: 'valid_chimpanzee@profiles.elastic.co',
            full_name: 'Valid Chimpanzee',
            username: 'valid_chimpanzee',
          },
          uid: 'u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0',
        },
      ],
      participants: [
        {
          user: {
            email: 'participant_1@elastic.co',
            full_name: 'Participant 1',
            username: 'participant_1',
          },
        },
        {
          user: {
            email: 'participant_2@elastic.co',
            full_name: null,
            username: 'participant_2',
          },
        },
      ],
      reporter: {
        user: {
          email: 'reporter_no_uid@elastic.co',
          full_name: 'Reporter No UID',
          username: 'reporter_no_uid',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = GetCaseUsersResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = GetCaseUsersResponseRt.decode({
        ...defaultRequest,
        foo: 'bar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from assigned users', () => {
      const query = GetCaseUsersResponseRt.decode({
        ...defaultRequest,
        assignees: [{ ...defaultRequest.assignees[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, assignees: [{ ...defaultRequest.assignees[0] }] },
      });
    });

    it('removes foo:bar attributes from unassigned users', () => {
      const query = GetCaseUsersResponseRt.decode({
        ...defaultRequest,
        unassignedUsers: [{ ...defaultRequest.unassignedUsers[1], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, unassignedUsers: [{ ...defaultRequest.unassignedUsers[1] }] },
      });
    });

    it('removes foo:bar attributes from participants', () => {
      const query = GetCaseUsersResponseRt.decode({
        ...defaultRequest,
        participants: [{ ...defaultRequest.participants[0], foo: 'bar' }],
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, participants: [{ ...defaultRequest.participants[0] }] },
      });
    });

    it('removes foo:bar attributes from reporter', () => {
      const query = GetCaseUsersResponseRt.decode({
        ...defaultRequest,
        reporter: {
          ...defaultRequest.reporter,
          foo: 'bar',
        },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
