/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { unquoteString } from '../unquote_string';

describe('unquoteString', () => {
  it('removes double quotes', () => {
    expect(unquoteString('"hello world"')).to.equal('hello world');
  });

  it('removes single quotes', () => {
    expect(unquoteString("'hello world'")).to.equal('hello world');
  });

  it('returns unquoted strings', () => {
    expect(unquoteString('hello world')).to.equal('hello world');
    expect(unquoteString('hello')).to.equal('hello');
    expect(unquoteString('hello"world')).to.equal('hello"world');
    expect(unquoteString("hello'world")).to.equal("hello'world");
    expect(unquoteString("'hello'world")).to.equal("'hello'world");
    expect(unquoteString('"hello"world')).to.equal('"hello"world');
  });
});
