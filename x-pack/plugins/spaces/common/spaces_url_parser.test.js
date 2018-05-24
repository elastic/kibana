/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { stripSpaceUrlContext, getSpaceUrlContext, addSpaceUrlContext } from './spaces_url_parser';

describe('stripSpaceUrlContext', () => {
  test('it removes the space url context from the base path when the space is not at the root', () => {
    const basePath = `/foo/s/my-space`;
    expect(stripSpaceUrlContext(basePath)).toEqual('/foo');
  });

  test('it removes the space url context from the base path when the space is the root', () => {
    const basePath = `/s/my-space`;
    expect(stripSpaceUrlContext(basePath)).toEqual('');
  });

  test(`it doesn't change base paths without a space url context`, () => {
    const basePath = `/this/is/a-base-path/ok`;
    expect(stripSpaceUrlContext(basePath)).toEqual(basePath);
  });

  test('it accepts no parameters', () => {
    expect(stripSpaceUrlContext()).toEqual('');
  });

  test('it remove the trailing slash', () => {
    expect(stripSpaceUrlContext('/')).toEqual('');
  });
});

describe('getSpaceUrlContext', () => {
  test('it identifies the space url context', () => {
    const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
    expect(getSpaceUrlContext(basePath)).toEqual('my-awesome-space-lives-here');
  });

  test('it handles base url without a space url context', () => {
    const basePath = `/this/is/a/crazy/path/s`;
    expect(getSpaceUrlContext(basePath)).toEqual('');
  });
});

describe('addSpaceUrlContext', () => {
  test('handles no parameters', () => {
    expect(addSpaceUrlContext()).toEqual(`/`);
  });

  test('it adds to the basePath correctly', () => {
    expect(addSpaceUrlContext('/my/base/path', 'url-context')).toEqual('/my/base/path/s/url-context');
  });

  test('it appends the requested path to the end of the url context', () => {
    expect(addSpaceUrlContext('/base', 'context', '/final/destination')).toEqual('/base/s/context/final/destination');
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSpaceUrlContext('', '', 'foo');
    }).toThrowErrorMatchingSnapshot();
  });
});
