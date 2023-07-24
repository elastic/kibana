/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesStatusRequestRt, CasesStatusResponseRt } from './status';

describe('status', () => {
  describe('CasesStatusRequestRt', () => {
    const defaultRequest = {
      from: '2022-04-28T15:18:00.000Z',
      to: '2022-04-28T15:22:00.000Z',
      owner: 'cases',
    };

    it('has expected attributes in request', () => {
      const query = CasesStatusRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has removes foo:bar attributes from request', () => {
      const query = CasesStatusRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CasesStatusResponseRt', () => {
    const defaultResponse = {
      count_closed_cases: 1,
      count_in_progress_cases: 2,
      count_open_cases: 1,
    };

    it('has expected attributes in response', () => {
      const query = CasesStatusResponseRt.decode(defaultResponse);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });

    it('removes foo:bar attributes from response', () => {
      const query = CasesStatusResponseRt.decode({ ...defaultResponse, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultResponse,
      });
    });
  });
});
