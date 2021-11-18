/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionAST } from '@kbn/interpreter/common';
import { Filter } from '../../types';
import {
  adaptCanvasFilter,
  adaptFilterToExpression,
  tranformObjectToArgs,
} from './filter_adapters';

describe('adaptCanvasFilter', () => {
  const filterAST: ExpressionFunctionAST = {
    type: 'function',
    function: 'exactly',
    arguments: {
      type: ['exactly'],
      column: ['project'],
      filterGroup: [],
      value: ['kibana'],
    },
  };

  const id = '0';

  it('returns filter when AST arguments consists of arrays with one element', () => {
    const resultFilter = {
      id,
      type: 'exactly',
      column: 'project',
      filterGroup: null,
      value: 'kibana',
    };

    const filter = adaptCanvasFilter(filterAST, id);
    expect(filter).toEqual(resultFilter);
  });

  it('returns filter with all additional fields stored on value field', () => {
    const { value, ...rest } = filterAST.arguments;
    const additionalArguments = { value1: ['value1'], value2: ['value2'] };
    const newFilterAST = { ...filterAST, arguments: { ...rest, ...additionalArguments } };

    const resultFilter = {
      id,
      type: 'exactly',
      column: 'project',
      filterGroup: null,
      value: { value1: 'value1', value2: 'value2' },
    };

    const filter = adaptCanvasFilter(newFilterAST, id);
    expect(filter).toEqual(resultFilter);
  });

  it('returns filter if args are empty', () => {
    const { arguments: args, ...rest } = filterAST;

    const resultFilter = {
      id,
      type: 'exactly',
      column: null,
      filterGroup: null,
      value: null,
    };

    const filter = adaptCanvasFilter({ ...rest, arguments: {} }, id);
    expect(filter).toEqual(resultFilter);
  });
});

describe('tranformObjectToArgs', () => {
  const obj = { prop1: 1, prop2: 'prop', prop3: null };
  it('should return valid args object for plain values', () => {
    expect(tranformObjectToArgs(obj)).toEqual({
      prop1: [1],
      prop2: ['prop'],
      prop3: [null],
    });
  });

  it('should return valid args object for array values', () => {
    const prop3 = [1, '3', null];
    expect(tranformObjectToArgs({ ...obj, prop3 })).toEqual({
      prop1: [1],
      prop2: ['prop'],
      prop3,
    });
  });

  it('should return empty object if empty object was passed', () => {
    expect(tranformObjectToArgs({})).toEqual({});
  });
});

describe('adaptFilterToExpression', () => {
  const id = '0';

  it('should return exactly filter expression', () => {
    const filter: Filter = {
      id,
      type: 'exactly',
      column: 'project',
      filterGroup: null,
      value: 'kibana',
    };
    expect(adaptFilterToExpression(filter)).toBe(
      `exactly column="project" filterGroup=null value="kibana"`
    );
  });

  it('should return time filter expression', () => {
    const filter: Filter = {
      id,
      type: 'time',
      column: '@timestamp',
      filterGroup: 'Group 1',
      value: { from: '2.10.2021 12:33', to: '2.10.2021 12:33' },
    };
    expect(adaptFilterToExpression(filter)).toEqual(
      `timefilter column="@timestamp" filterGroup="Group 1" from="2.10.2021 12:33" to="2.10.2021 12:33"`
    );
  });

  it('should return time filter expression for invalid time', () => {
    const filter: Filter = {
      id,
      type: 'time',
      column: '@timestamp',
      filterGroup: 'Group 1',
      value: { from: 'some time', to: 'some time 2' },
    };
    expect(adaptFilterToExpression(filter)).toEqual(
      `timefilter column="@timestamp" filterGroup="Group 1" from="some time" to="some time 2"`
    );
  });

  it('should return expression with random arguments', () => {
    const filter: any = {
      id,
      type: 'exactly',
      column: '@timestamp',
      filterGroup: 'Group 1',
      value: { val1: 'some time', val2: null },
    };
    expect(adaptFilterToExpression(filter)).toEqual(
      `exactly column="@timestamp" filterGroup="Group 1" val1="some time" val2=null`
    );
  });
});
