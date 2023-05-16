/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAssigneesRt } from './assignee';

describe('Assignee', () => {
  describe('CaseAssigneesRt', () => {
    it('has expected attributes in request', () => {
      const query = CaseAssigneesRt.decode([{ uid: '1' }, { uid: '2' }]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [
          {
            uid: '1',
          },
          {
            uid: '2',
          },
        ],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseAssigneesRt.decode([{ uid: '1', foo: 'bar' }]);

      expect(query).toMatchObject({
        _tag: 'Right',
        right: [
          {
            uid: '1',
          },
        ],
      });
    });
  });
});
