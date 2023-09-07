/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../attachment/v1';
import { UserActionTypes } from './action/v1';
import { UserActionsRt } from './v1';

describe('User actions', () => {
  describe('UserActionsRt', () => {
    const defaultRequest = [
      {
        type: UserActionTypes.comment,
        payload: {
          comment: {
            comment: 'this is a sample comment',
            type: AttachmentType.user,
            owner: 'cases',
          },
        },
        created_at: '2020-02-19T23:06:33.798Z',
        created_by: {
          full_name: 'Leslie Knope',
          username: 'lknope',
          email: 'leslie.knope@elastic.co',
        },
        owner: 'cases',
        action: 'create',
        id: 'basic-comment-id',
        version: 'WzQ3LDFc',
        comment_id: 'basic-comment-id',
      },
    ];

    it('has expected attributes in request', () => {
      const query = UserActionsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [...defaultRequest],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionsRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = UserActionsRt.decode([
        { ...defaultRequest[0], payload: { ...defaultRequest[0].payload, foo: 'bar' } },
      ]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
