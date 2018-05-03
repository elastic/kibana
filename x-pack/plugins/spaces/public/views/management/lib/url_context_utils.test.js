/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { toUrlContext } from './url_context_utils';

test('it converts whitespace to dashes', () => {
  const input = `this is a test`;
  expect(toUrlContext(input)).toEqual('this-is-a-test');
});

test('it converts everything to lowercase', () => {
  const input = `THIS IS A TEST`;
  expect(toUrlContext(input)).toEqual('this-is-a-test');
});

test('it converts non-alphanumeric characters to dashes', () => {
  const input = `~!@#$%^&*()_+-=[]{}\|';:"/.,<>?` + "`";

  const expectedResult = new Array(input.length + 1).join('-');

  expect(toUrlContext(input)).toEqual(expectedResult);
});
