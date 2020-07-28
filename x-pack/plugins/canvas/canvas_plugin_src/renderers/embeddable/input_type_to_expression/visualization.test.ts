/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toExpression } from './visualization';
import { fromExpression, Ast } from '@kbn/interpreter/common';

const baseInput = {
  id: 'embeddableId',
};

describe('toExpression', () => {
  it('converts to a savedVisualization expression', () => {
    const input = {
      ...baseInput,
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    expect(ast.type).toBe('expression');
    expect(ast.chain[0].function).toBe('savedVisualization');

    expect(ast.chain[0].arguments.id).toStrictEqual([input.id]);
  });

  it('includes timerange if given', () => {
    const input = {
      ...baseInput,
      timeRange: {
        from: 'now-1h',
        to: 'now',
      },
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    const timerangeExpression = ast.chain[0].arguments.timerange[0] as Ast;

    expect(timerangeExpression.chain[0].function).toBe('timerange');
    expect(timerangeExpression.chain[0].arguments.from[0]).toEqual(input.timeRange?.from);
    expect(timerangeExpression.chain[0].arguments.to[0]).toEqual(input.timeRange?.to);
  });

  it('includes colors if given', () => {
    const colorMap = { a: 'red', b: 'blue' };

    const input = {
      ...baseInput,
      vis: {
        colors: {
          a: 'red',
          b: 'blue',
        },
      },
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    const colors = ast.chain[0].arguments.colors as Ast[];

    const aColor = colors.find((color) => color.chain[0].arguments.label[0] === 'a');
    const bColor = colors.find((color) => color.chain[0].arguments.label[0] === 'b');

    expect(aColor?.chain[0].arguments.color[0]).toBe(colorMap.a);
    expect(bColor?.chain[0].arguments.color[0]).toBe(colorMap.b);
  });
});
