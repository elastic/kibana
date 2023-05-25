/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAssigneesRt } from './assignee';

describe('Assignee', () => {
  describe('CaseAssigneesRt', () => {
    const defaultRequest = [{ uid: '1' }, { uid: '2' }];

    it('has expected attributes in request', () => {
      const query = CaseAssigneesRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseAssigneesRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [defaultRequest[0]],
      });
    });

    it('removes foo:bar attributes from assignees', () => {
      const query = CaseAssigneesRt.decode([{ uid: '1', foo: 'bar' }, { uid: '2' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [{ uid: '1' }, { uid: '2' }],
      });
    });
  });
});
