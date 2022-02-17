/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toExpression } from './lens';
import { SavedLensInput } from '../../../functions/external/saved_lens';
import { fromExpression, Ast } from '@kbn/interpreter';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';

const baseEmbeddableInput = {
  id: 'elementId',
  savedObjectId: 'embeddableId',
  filters: [],
};

describe('toExpression', () => {
  it('converts to a savedLens expression', () => {
    const input: SavedLensInput = {
      ...baseEmbeddableInput,
    };

    const expression = toExpression(input, chartPluginMock.createPaletteRegistry());
    const ast = fromExpression(expression);

    expect(ast.type).toBe('expression');
    expect(ast.chain[0].function).toBe('savedLens');

    expect(ast.chain[0].arguments.id).toStrictEqual([input.savedObjectId]);

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

    const expression = toExpression(input, chartPluginMock.createPaletteRegistry());
    const ast = fromExpression(expression);

    expect(ast.chain[0].arguments).toHaveProperty('title', [input.title]);
    expect(ast.chain[0].arguments).toHaveProperty('timerange');

    const timerangeExpression = ast.chain[0].arguments.timerange[0] as Ast;
    expect(timerangeExpression.chain[0].function).toBe('timerange');
    expect(timerangeExpression.chain[0].arguments.from[0]).toEqual(input.timeRange?.from);
    expect(timerangeExpression.chain[0].arguments.to[0]).toEqual(input.timeRange?.to);
  });

  it('includes empty panel title', () => {
    const input: SavedLensInput = {
      ...baseEmbeddableInput,
      title: '',
    };

    const expression = toExpression(input, chartPluginMock.createPaletteRegistry());
    const ast = fromExpression(expression);

    expect(ast.chain[0].arguments).toHaveProperty('title', [input.title]);
  });
});
