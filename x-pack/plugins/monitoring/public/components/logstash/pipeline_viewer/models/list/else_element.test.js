/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElseElement } from './else_element';

describe('ElseElement', () => {
  let statement;
  let depth;
  let parentId;

  beforeEach(() => {
    statement = {
      id: 'statement_id',
    };

    depth = 2;
    parentId = 'parent_id';
  });

  it('has expected props', () => {
    const element = new ElseElement(statement, depth, parentId);

    expect(element.id).toBe('statement_id_else');
    expect(element.statement).toBe(statement);
    expect(element.depth).toBe(depth);
    expect(element.parentId).toBe(parentId);
  });
});
