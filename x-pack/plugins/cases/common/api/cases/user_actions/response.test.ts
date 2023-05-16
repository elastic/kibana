/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../comment';
import { ActionTypes } from './common';
import {
  UserActionsRt,
  CaseUserActionsDeprecatedResponseRt,
  CaseUserActionStatsResponseRt,
} from './response';

describe('Response', () => {
  describe('UserActionsRt', () => {
    const defaultRequest = [
      {
        type: ActionTypes.comment,
        payload: {
          comment: {
            comment: 'this is a sample comment',
            type: CommentType.user,
            owner: 'cases',
          },
        },
        id: 'basic-comment-id',
        version: 'WzQ3LDFc',
        comment_id: 'basic-comment-id',
      },
    ];

    it('has expected attributes in request', () => {
      const query = UserActionsRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [...defaultRequest],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionsRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = UserActionsRt.decode([
        { ...defaultRequest, payload: { ...defaultRequest[0].payload, foo: 'bar' } },
      ]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });
  });

  describe('CaseUserActionsDeprecatedResponseRt', () => {
    const defaultRequest = [
      {
        type: ActionTypes.comment,
        payload: {
          comment: {
            comment: 'this is a sample comment',
            type: CommentType.user,
            owner: 'cases',
          },
        },
      },
    ];

    it('has expected attributes in request', () => {
      const query = CaseUserActionsDeprecatedResponseRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [...defaultRequest],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseUserActionsDeprecatedResponseRt.decode([
        { ...defaultRequest[0], foo: 'bar' },
      ]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });
  });

  describe('CaseUserActionStatsResponseRt', () => {
    const defaultRequest = {
      type: ActionTypes.pushed,
      payload: {
        externalService: {
          connector_name: 'My SN connector',
          external_id: 'external_id',
          external_title: 'external title',
          external_url: 'basicPush.com',
          pushed_at: '2023-01-17T09:46:29.813Z',
          pushed_by: {
            full_name: 'Leslie Knope',
            username: 'lknope',
            email: 'leslie.knope@elastic.co',
          },
        },
      },
    };

    it('has expected attributes in request', () => {
      const query = CaseUserActionStatsResponseRt.decode(defaultRequest);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseUserActionStatsResponseRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = CaseUserActionStatsResponseRt.decode({
        ...defaultRequest,
        payload: { ...defaultRequest.payload, foo: 'bar' },
      });

      expect(query).toMatchObject({
        _tag: 'Right',
        right: {
          ...defaultRequest,
        },
      });
    });
  });
});
