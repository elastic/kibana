/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getByAlias } from '../get_by_alias';

describe('getByAlias', () => {
  const fns = {
    foo: { aliases: ['f'] },
    bar: { aliases: ['b'] },
  };

  it('returns the function by name', () => {
    expect(getByAlias(fns, 'foo')).to.be(fns.foo);
    expect(getByAlias(fns, 'bar')).to.be(fns.bar);
  });

  it('returns the function by alias', () => {
    expect(getByAlias(fns, 'f')).to.be(fns.foo);
    expect(getByAlias(fns, 'b')).to.be(fns.bar);
  });

  it('returns the function by case-insensitive name', () => {
    expect(getByAlias(fns, 'FOO')).to.be(fns.foo);
    expect(getByAlias(fns, 'BAR')).to.be(fns.bar);
  });

  it('returns the function by case-insensitive alias', () => {
    expect(getByAlias(fns, 'F')).to.be(fns.foo);
    expect(getByAlias(fns, 'B')).to.be(fns.bar);
  });

  it('handles empty strings', () => {
    const emptyStringFns = { '': {} };
    const emptyStringAliasFns = { foo: { aliases: [''] } };
    expect(getByAlias(emptyStringFns, '')).to.be(emptyStringFns['']);
    expect(getByAlias(emptyStringAliasFns, '')).to.be(emptyStringAliasFns.foo);
  });

  it('handles "undefined" strings', () => {
    const emptyStringFns = { undefined: {} };
    const emptyStringAliasFns = { foo: { aliases: ['undefined'] } };
    expect(getByAlias(emptyStringFns, 'undefined')).to.be(emptyStringFns.undefined);
    expect(getByAlias(emptyStringAliasFns, 'undefined')).to.be(emptyStringAliasFns.foo);
  });

  it('returns undefined if not found', () => {
    expect(getByAlias(fns, 'baz')).to.be(undefined);
  });
});
