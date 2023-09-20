/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SUGGESTED_PROFILES } from '../../../constants';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { GetCaseUsersResponseRt, SuggestUserProfilesRequestRt } from './v1';

describe('User', () => {
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

  describe('UserProfile', () => {
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
  });
});
