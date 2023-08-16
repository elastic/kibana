/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertResponseRt } from './v1';

describe('Alerts', () => {
  describe('AlertResponseRt', () => {
    it('has expected attributes in request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];

      const query = AlertResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('multiple attributes in request', () => {
      const defaultRequest = [
        { id: '1', index: '2', attached_at: '3' },
        { id: '2', index: '3', attached_at: '4' },
      ];
      const query = AlertResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const query = AlertResponseRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });
});
