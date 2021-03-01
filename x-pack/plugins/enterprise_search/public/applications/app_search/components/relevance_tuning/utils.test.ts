/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BoostType } from './types';
import {
  filterIfTerm,
  normalizeBoostValues,
  removeBoostStateProps,
  parseBoostCenter,
} from './utils';

describe('filterIfTerm', () => {
  it('will filter a list of strings to a list of strings containing the specified string', () => {
    expect(filterIfTerm(['jalepeno', 'no', 'not', 'panorama', 'truck'], 'no')).toEqual([
      'jalepeno',
      'no',
      'not',
      'panorama',
    ]);
  });

  it('will not filter at all if an empty string is provided', () => {
    expect(filterIfTerm(['jalepeno', 'no', 'not', 'panorama', 'truck'], '')).toEqual([
      'jalepeno',
      'no',
      'not',
      'panorama',
      'truck',
    ]);
  });
});

describe('removeBoostStateProps', () => {
  it('will remove the newBoost flag from boosts within the provided searchSettings object', () => {
    const searchSettings = {
      boosts: {
        foo: [
          {
            type: BoostType.Value,
            factor: 5,
            newBoost: true,
          },
        ],
      },
      search_fields: {
        foo: {
          weight: 1,
        },
      },
    };
    expect(removeBoostStateProps(searchSettings)).toEqual({
      ...searchSettings,
      boosts: {
        foo: [
          {
            type: BoostType.Value,
            factor: 5,
          },
        ],
      },
    });
  });
});

describe('parseBoostCenter', () => {
  it('should parse the value to a number when the type is number', () => {
    expect(parseBoostCenter('number', 5)).toEqual(5);
    expect(parseBoostCenter('number', '5')).toEqual(5);
  });

  it('should not try to parse the value when the type is text', () => {
    expect(parseBoostCenter('text', 5)).toEqual(5);
    expect(parseBoostCenter('text', '4')).toEqual('4');
  });

  it('should leave text invalid numbers alone', () => {
    expect(parseBoostCenter('number', 'foo')).toEqual('foo');
  });
});

describe('normalizeBoostValues', () => {
  const boosts = {
    foo: [
      {
        type: BoostType.Value,
        factor: 9.5,
        value: 1,
      },
      {
        type: BoostType.Value,
        factor: 9.5,
        value: '1',
      },
      {
        type: BoostType.Value,
        factor: 9.5,
        value: [1],
      },
      {
        type: BoostType.Value,
        factor: 9.5,
        value: ['1'],
      },
      {
        type: BoostType.Value,
        factor: 9.5,
        value: [
          '1',
          1,
          '2',
          2,
          true,
          {
            b: 'a',
          },
          {},
        ],
      },
    ],
    bar: [
      {
        type: BoostType.Proximity,
        factor: 9.5,
      },
    ],
    sp_def: [
      {
        type: BoostType.Functional,
        factor: 5,
      },
    ],
  };

  it('converts all value types to string for consistency', () => {
    expect(normalizeBoostValues(boosts)).toEqual({
      bar: [{ factor: 9.5, type: BoostType.Proximity }],
      foo: [
        { factor: 9.5, type: BoostType.Value, value: ['1'] },
        { factor: 9.5, type: BoostType.Value, value: ['1'] },
        { factor: 9.5, type: BoostType.Value, value: ['1'] },
        { factor: 9.5, type: BoostType.Value, value: ['1'] },
        {
          factor: 9.5,
          type: BoostType.Value,
          value: ['1', '1', '2', '2', 'true', '[object Object]', '[object Object]'],
        },
      ],
      sp_def: [{ type: BoostType.Functional, factor: 5 }],
    });
  });
});
