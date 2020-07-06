/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toExpression } from './map';
import { MapEmbeddableInput } from '../../../../../../plugins/maps/public/embeddable';
import { fromExpression, Ast } from '@kbn/interpreter/common';

const baseSavedMapInput = {
  id: 'embeddableId',
  filters: [],
  isLayerTOCOpen: false,
  refreshConfig: {
    pause: true,
    value: 0,
  },
  hideFilterActions: true as true,
};

describe('toExpression', () => {
  it('converts to a savedMap expression', () => {
    const input: MapEmbeddableInput = {
      ...baseSavedMapInput,
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    expect(ast.type).toBe('expression');
    expect(ast.chain[0].function).toBe('savedMap');

    expect(ast.chain[0].arguments.id).toStrictEqual([input.id]);

    expect(ast.chain[0].arguments).not.toHaveProperty('title');
    expect(ast.chain[0].arguments).not.toHaveProperty('center');
    expect(ast.chain[0].arguments).not.toHaveProperty('timerange');
  });

  it('includes optional input values', () => {
    const input: MapEmbeddableInput = {
      ...baseSavedMapInput,
      mapCenter: {
        lat: 1,
        lon: 2,
        zoom: 3,
      },
      title: 'title',
      timeRange: {
        from: 'now-1h',
        to: 'now',
      },
    };

    const expression = toExpression(input);
    const ast = fromExpression(expression);

    const centerExpression = ast.chain[0].arguments.center[0] as Ast;

    expect(centerExpression.chain[0].function).toBe('mapCenter');
    expect(centerExpression.chain[0].arguments.lat[0]).toEqual(input.mapCenter?.lat);
    expect(centerExpression.chain[0].arguments.lon[0]).toEqual(input.mapCenter?.lon);
    expect(centerExpression.chain[0].arguments.zoom[0]).toEqual(input.mapCenter?.zoom);

    const timerangeExpression = ast.chain[0].arguments.timerange[0] as Ast;

    expect(timerangeExpression.chain[0].function).toBe('timerange');
    expect(timerangeExpression.chain[0].arguments.from[0]).toEqual(input.timeRange?.from);
    expect(timerangeExpression.chain[0].arguments.to[0]).toEqual(input.timeRange?.to);
  });
});
