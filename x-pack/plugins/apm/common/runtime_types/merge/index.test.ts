/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { merge } from './';
import { jsonRt } from '../json_rt';

describe('merge', () => {
  it('fails on one or more errors', () => {
    const type = merge([t.type({ foo: t.string }), t.type({ bar: t.number })]);

    const result = type.decode({ foo: '' });

    expect(isLeft(result)).toBe(true);
  });

  it('merges left to right', () => {
    const typeBoolean = merge([
      t.type({ foo: t.string }),
      t.type({ foo: jsonRt.pipe(t.boolean) }),
    ]);

    const resultBoolean = typeBoolean.decode({
      foo: 'true',
    });

    // @ts-expect-error
    expect(resultBoolean.right).toEqual({
      foo: true,
    });

    const typeString = merge([
      t.type({ foo: jsonRt.pipe(t.boolean) }),
      t.type({ foo: t.string }),
    ]);

    const resultString = typeString.decode({
      foo: 'true',
    });

    // @ts-expect-error
    expect(resultString.right).toEqual({
      foo: 'true',
    });
  });

  it('deeply merges values', () => {
    const type = merge([
      t.type({ foo: t.type({ baz: t.string }) }),
      t.type({ foo: t.type({ bar: t.string }) }),
    ]);

    const result = type.decode({
      foo: {
        bar: '',
        baz: '',
      },
    });

    // @ts-expect-error
    expect(result.right).toEqual({
      foo: {
        bar: '',
        baz: '',
      },
    });
  });
});
