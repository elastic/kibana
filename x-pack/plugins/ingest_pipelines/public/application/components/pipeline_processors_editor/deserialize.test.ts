/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserialize } from './deserialize';

describe('deserialize', () => {
  it('tolerates certain bad values correctly', () => {
    expect(
      deserialize({
        processors: [
          { set: { field: 'test', value: 123 } },
          { badType1: null } as any,
          { badType2: 1 } as any,
        ],
        onFailure: [
          {
            gsub: {
              field: '_index',
              pattern: '(.monitoring-\\w+-)6(-.+)',
              replacement: '$17$2',
            },
          },
        ],
      })
    ).toEqual({
      processors: [
        {
          id: expect.any(String),
          type: 'set',
          options: {
            field: 'test',
            value: 123,
          },
        },
        {
          id: expect.any(String),
          onFailure: undefined,
          type: 'badType1',
          options: {},
        },
        {
          id: expect.any(String),
          onFailure: undefined,
          type: 'badType2',
          options: {},
        },
      ],
      onFailure: [
        {
          id: expect.any(String),
          type: 'gsub',
          onFailure: undefined,
          options: {
            field: '_index',
            pattern: '(.monitoring-\\w+-)6(-.+)',
            replacement: '$17$2',
          },
        },
      ],
    });
  });

  it('throws for unacceptable values', () => {
    expect(() => {
      deserialize({
        processors: [{ reallyBad: undefined } as any, 1 as any],
        onFailure: [],
      });
    }).toThrow('Invalid processor type');
  });
});
