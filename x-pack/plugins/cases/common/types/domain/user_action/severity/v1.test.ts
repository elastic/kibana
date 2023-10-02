/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../../case/v1';
import { UserActionTypes } from '../action/v1';
import { SeverityUserActionPayloadRt, SeverityUserActionRt } from './v1';

describe('Severity', () => {
  describe('SeverityUserActionPayloadRt', () => {
    const defaultRequest = {
      severity: CaseSeverity.MEDIUM,
    };

    it('has expected attributes in request', () => {
      const query = SeverityUserActionPayloadRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SeverityUserActionPayloadRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('SeverityUserActionRt', () => {
    const defaultRequest = {
      type: UserActionTypes.severity,
      payload: {
        severity: CaseSeverity.CRITICAL,
      },
    };

    it('has expected attributes in request', () => {
      const query = SeverityUserActionRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = SeverityUserActionRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = SeverityUserActionRt.decode({
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
