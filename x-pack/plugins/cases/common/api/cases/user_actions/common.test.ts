/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UserActionCommonAttributesRt,
  CaseUserActionInjectedIdsRt,
  CaseUserActionInjectedDeprecatedIdsRt,
} from './common';

describe('Common', () => {
  describe('UserActionCommonAttributesRt', () => {
    const defaultRequest = {
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'cases',
      action: 'add',
    };

    it('has expected attributes in request', () => {
      const query = UserActionCommonAttributesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionCommonAttributesRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseUserActionInjectedIdsRt', () => {
    const defaultRequest = {
      comment_id: 'comment-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseUserActionInjectedIdsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseUserActionInjectedIdsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseUserActionInjectedDeprecatedIdsRt', () => {
    const defaultRequest = {
      action_id: 'basic-action-id',
      case_id: 'basic-case-id',
      comment_id: 'basic-comment-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseUserActionInjectedDeprecatedIdsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseUserActionInjectedDeprecatedIdsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
