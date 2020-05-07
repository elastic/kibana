/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toExpression } from './lens';
import { SavedLensInput } from '../../../functions/common/saved_lens';
import { fromExpression, Ast } from '@kbn/interpreter/common';

const baseEmbeddableInput = {
  id: 'embeddableId',
  filters: [],
};

describe('toExpression', () => {
  it('converts to a savedLens expression', () => {
    const input: SavedLensInput = {
      ...baseEmbeddableInput,
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    expect(ast.type).toBe('expression');
    expect(ast.chain[0].function).toBe('savedLens');

    expect(ast.chain[0].arguments.id).toStrictEqual([input.id]);

    expect(ast.chain[0].arguments).not.toHaveProperty('title');
    expect(ast.chain[0].arguments).not.toHaveProperty('timerange');
  });

  it('includes optional input values', () => {
    const input: SavedLensInput = {
      ...baseEmbeddableInput,
      title: 'title',
      timeRange: {
        from: 'now-1h',
        to: 'now',
      },
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    expect(ast.chain[0].arguments).toHaveProperty('title', [input.title]);
    expect(ast.chain[0].arguments).toHaveProperty('timerange');

    const timerangeExpression = ast.chain[0].arguments.timerange[0] as Ast;
    expect(timerangeExpression.chain[0].function).toBe('timerange');
    expect(timerangeExpression.chain[0].arguments.from[0]).toEqual(input.timeRange?.from);
    expect(timerangeExpression.chain[0].arguments.to[0]).toEqual(input.timeRange?.to);
  });
});
