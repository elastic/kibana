/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { throwIfAbsent, throwIfIsntContained } from './value_validators';
import { v4 as uuidv4 } from 'uuid';

describe('throwIfAbsent', () => {
  test('throws if value is absent', () => {
    [undefined, null].forEach(val => {
      expect(() => {
        throwIfAbsent('OMG no value')(val);
      }).toThrowErrorMatchingInlineSnapshot(`"OMG no value"`);
    });
  });

  test('doesnt throws if value is present but falsey', () => {
    [false, ''].forEach(val => {
      expect(throwIfAbsent('OMG no value')(val)).toEqual(val);
    });
  });

  test('doesnt throw if value is present', () => {
    expect(throwIfAbsent('OMG no value')({})).toEqual({});
  });
});

describe('throwIfIsntContained', () => {
  test('throws if value is absent', () => {
    expect(() => {
      throwIfIsntContained<string>(new Set([uuidv4()]), 'OMG no value', val => val)([uuidv4()]);
    }).toThrowErrorMatchingInlineSnapshot(`"OMG no value"`);
  });

  test('throws if value is absent using custom message', () => {
    const id = uuidv4();
    expect(() => {
      throwIfIsntContained<string>(
        new Set([id]),
        (value: string) => `OMG no ${value}`,
        val => val
      )([uuidv4()]);
    }).toThrow(`OMG no ${id}`);
  });

  test('returns values if value is present', () => {
    const id = uuidv4();
    const values = [uuidv4(), uuidv4(), id, uuidv4()];
    expect(throwIfIsntContained<string>(new Set([id]), 'OMG no value', val => val)(values)).toEqual(
      values
    );
  });

  test('returns values if multiple values is present', () => {
    const [firstId, secondId] = [uuidv4(), uuidv4()];
    const values = [uuidv4(), uuidv4(), secondId, uuidv4(), firstId];
    expect(
      throwIfIsntContained<string>(new Set([firstId, secondId]), 'OMG no value', val => val)(values)
    ).toEqual(values);
  });

  test('allows a custom value extractor', () => {
    const [firstId, secondId] = [uuidv4(), uuidv4()];
    const values = [
      { id: firstId, some: 'prop' },
      { id: secondId, someOther: 'prop' },
    ];
    expect(
      throwIfIsntContained<{ id: string }>(
        new Set([firstId, secondId]),
        'OMG no value',
        (val: { id: string }) => val.id
      )(values)
    ).toEqual(values);
  });
});
