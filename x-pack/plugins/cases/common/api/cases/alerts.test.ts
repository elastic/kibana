/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertResponseRt } from './alerts';

describe('Alerts', () => {
  describe('AlertResponseRt', () => {
    it('has expected attributes in request', () => {
      const query = AlertResponseRt.decode([{ id: '1', index: '2', attached_at: '3' }]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [
          {
            id: '1',
            index: '2',
            attached_at: '3',
          },
        ],
      });
    });

    it('multiple attributes in request', () => {
      const query = AlertResponseRt.decode([
        { id: '1', index: '2', attached_at: '3' },
        { id: '2', index: '3', attached_at: '4' },
      ]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [
          {
            id: '1',
            index: '2',
            attached_at: '3',
          },
          { id: '2', index: '3', attached_at: '4' },
        ],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = AlertResponseRt.decode([{ id: '1', index: '2', attached_at: '3', foo: 'bar' }]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [
          {
            id: '1',
            index: '2',
            attached_at: '3',
          },
        ],
      });
    });
  });
});
