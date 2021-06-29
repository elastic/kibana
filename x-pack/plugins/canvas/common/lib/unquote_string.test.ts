/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unquoteString } from './unquote_string';

describe('unquoteString', () => {
  it('removes double quotes', () => {
    expect(unquoteString('"hello world"')).toEqual('hello world');
  });

  it('removes single quotes', () => {
    expect(unquoteString("'hello world'")).toEqual('hello world');
  });

  it('returns unquoted strings', () => {
    expect(unquoteString('hello world')).toEqual('hello world');
    expect(unquoteString('hello')).toEqual('hello');
    expect(unquoteString('hello"world')).toEqual('hello"world');
    expect(unquoteString("hello'world")).toEqual("hello'world");
    expect(unquoteString("'hello'world")).toEqual("'hello'world");
    expect(unquoteString('"hello"world')).toEqual('"hello"world');
  });
});
