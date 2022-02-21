/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AstFunction } from '@kbn/interpreter';
import { adaptCanvasFilter } from './filter_adapters';

describe('adaptCanvasFilter', () => {
  const filterAST: AstFunction = {
    type: 'function',
    function: 'exactly',
    arguments: {
      type: ['exactly'],
      column: ['project'],
      filterGroup: [],
      value: ['kibana'],
    },
  };

  it('returns filter when AST arguments consists of arrays with one element', () => {
    const resultFilter = { type: 'exactly', column: 'project', filterGroup: null, value: 'kibana' };

    const filter = adaptCanvasFilter(filterAST);
    expect(filter).toEqual(resultFilter);
  });

  it('returns filter with all additional fields stored on value field', () => {
    const { value, ...rest } = filterAST.arguments;
    const additionalArguments = { value1: ['value1'], value2: ['value2'] };
    const newFilterAST = { ...filterAST, arguments: { ...rest, ...additionalArguments } };

    const resultFilter = {
      type: 'exactly',
      column: 'project',
      filterGroup: null,
      value: { value1: 'value1', value2: 'value2' },
    };

    const filter = adaptCanvasFilter(newFilterAST);
    expect(filter).toEqual(resultFilter);
  });

  it('returns filter if args are empty', () => {
    const { arguments: args, ...rest } = filterAST;

    const resultFilter = {
      type: 'exactly',
      column: null,
      filterGroup: null,
      value: null,
    };

    const filter = adaptCanvasFilter({ ...rest, arguments: {} });
    expect(filter).toEqual(resultFilter);
  });
});
