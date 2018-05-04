/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { stripSpaceUrlContext, getSpaceUrlContext } from './spaces_url_parser';

test('it removes the space url context from the base path when the space is not at the root', () => {
  const basePath = `/foo/s/my-space`;
  expect(stripSpaceUrlContext(basePath)).toEqual('/foo');
});

test('it removes the space url context from the base path when the space is the root', () => {
  const basePath = `/s/my-space`;
  expect(stripSpaceUrlContext(basePath)).toEqual('/');
});

test(`it doesn't change base paths without a space url context`, () => {
  const basePath = `/this/is/a-base-path/ok`;
  expect(stripSpaceUrlContext(basePath)).toEqual(basePath);
});

test('it accepts no parameters', () => {
  expect(stripSpaceUrlContext()).toEqual('/');
});

test('it identifies the space url context', () => {
  const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
  expect(getSpaceUrlContext(basePath)).toEqual('my-awesome-space-lives-here');
});

test('it handles base url without a space url context', () => {
  const basePath = `/this/is/a/crazy/path/s`;
  expect(getSpaceUrlContext(basePath)).toEqual(null);
});
