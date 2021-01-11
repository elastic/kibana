/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';

describe('Statement class', () => {
  let vertex;
  let meta;

  beforeEach(() => {
    meta = {
      source: {
        id: 'output',
        user: 'user',
        password: 'password',
      },
    };
    vertex = {
      meta,
      id: 'statement_id',
      hasExplicitId: true,
      stats: {},
    };
  });

  describe('Statement from constructor', () => {
    it('creates a new Statement instance', () => {
      const statement = new Statement(vertex);

      expect(statement.id).toBe('statement_id');
      expect(statement.hasExplicitId).toBe(true);
      expect(statement.stats).toEqual({});
      expect(statement.meta).toEqual(meta);
      expect(statement.vertex).toEqual(vertex);
    });
  });
});
