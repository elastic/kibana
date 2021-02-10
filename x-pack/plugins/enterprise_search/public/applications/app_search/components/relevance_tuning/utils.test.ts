/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BoostType } from './types';
import { normalizeBoostValues } from './utils';

describe('normalizeBoostValues', () => {
  const boosts = {
    foo: [
      {
        type: 'value' as BoostType,
        factor: 9.5,
        value: 1,
      },
      {
        type: 'value' as BoostType,
        factor: 9.5,
        value: '1',
      },
      {
        type: 'value' as BoostType,
        factor: 9.5,
        value: [1],
      },
      {
        type: 'value' as BoostType,
        factor: 9.5,
        value: ['1'],
      },
      {
        type: 'value' as BoostType,
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
        type: 'proximity' as BoostType,
        factor: 9.5,
      },
    ],
    sp_def: [
      {
        type: 'functional' as BoostType,
        factor: 5,
      },
    ],
  };

  it('renders', () => {
    expect(normalizeBoostValues(boosts)).toEqual({
      bar: [{ factor: 9.5, type: 'proximity' }],
      foo: [
        { factor: 9.5, type: 'value', value: ['1'] },
        { factor: 9.5, type: 'value', value: ['1'] },
        { factor: 9.5, type: 'value', value: ['1'] },
        { factor: 9.5, type: 'value', value: ['1'] },
        {
          factor: 9.5,
          type: 'value',
          value: ['1', '1', '2', '2', 'true', '[object Object]', '[object Object]'],
        },
      ],
      sp_def: [{ type: 'functional', factor: 5 }],
    });
  });
});
