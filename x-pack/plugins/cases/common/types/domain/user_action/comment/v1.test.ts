/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../api';
import { UserActionTypes } from '../action/v1';
import { CommentUserActionPayloadRt, CommentUserActionRt } from './v1';

describe('Comment', () => {
  describe('CommentUserActionPayloadRt', () => {
    const defaultRequest = {
      comment: {
        comment: 'this is a sample comment',
        type: CommentType.user,
        owner: 'cases',
      },
    };

    it('has expected attributes in request', () => {
      const query = CommentUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from comment', () => {
      const query = CommentUserActionPayloadRt.decode({
        comment: { ...defaultRequest.comment, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
  describe('CommentUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.comment,
      payload: {
        comment: {
          comment: 'this is a sample comment',
          type: CommentType.user,
          owner: 'cases',
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = CommentUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CommentUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = CommentUserActionRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
