/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionFindResponseRt, UserActionFindRequestRt } from './find';
import { ActionTypes } from '../common';

describe('Find UserActions', () => {
  describe('UserActionFindRequestRt', () => {
    const defaultRequest = {
      types: [ActionTypes.comment],
      sortOrder: 'desc',
      page: '1',
      perPage: '10',
    };

    it('has expected attributes in request', () => {
      const query = UserActionFindRequestRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });
  });

  describe('UserActionFindResponseRt', () => {
    const defaultRequest = {
      userActions: [
        {
          type: ActionTypes.comment,
          payload: {
            comment: 'Solve this fast!',
          },
          owner: 'cases',
          id: 'basic-comment-id',
          version: 'WzQ3LDFc',
          created_at: '2020-02-19T23:06:33.798Z',
          created_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      ],
      page: 1,
      perPage: 10,
      total: 20,
    };

    it('has expected attributes in request', () => {
      const query = UserActionFindResponseRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionFindResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });
  });
});
