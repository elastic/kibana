/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldRule } from '.';

describe('FieldRule', () => {
  ['*', 1, null, true, false].forEach(value => {
    it(`can convert itself to raw form with a single value of ${value}`, () => {
      const rule = new FieldRule('username', value);
      expect(rule.toRaw()).toEqual({
        field: {
          username: value,
        },
      });
    });
  });

  it('can convert itself to raw form with an array of values', () => {
    const values = ['*', 1, null, true, false];
    const rule = new FieldRule('username', values);
    const raw = rule.toRaw();
    expect(raw).toEqual({
      field: {
        username: ['*', 1, null, true, false],
      },
    });

    // shoud not be the same array instance
    expect(raw.field.username).not.toBe(values);
  });

  it('can clone itself', () => {
    const values = ['*', 1, null];
    const rule = new FieldRule('username', values);

    const clone = rule.clone();
    expect(clone.field).toEqual(rule.field);
    expect(clone.value).toEqual(rule.value);
    expect(clone.value).not.toBe(rule.value);
    expect(clone.toRaw()).toEqual(rule.toRaw());
  });
});
