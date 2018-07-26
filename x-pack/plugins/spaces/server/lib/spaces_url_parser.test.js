/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getSpaceUrlContext, addSpaceUrlContext } from './spaces_url_parser';

describe('getSpaceUrlContext', () => {
  describe('without a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceUrlContext(basePath)).toEqual('my-awesome-space-lives-here');
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceUrlContext(basePath)).toEqual('');
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceUrlContext(basePath)).toEqual('');
    });
  });

  describe('with a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceUrlContext(basePath, '/')).toEqual('my-awesome-space-lives-here');
    });

    test('it identifies the space url context following the server base path', () => {
      const basePath = `/server-base-path-here/s/my-awesome-space-lives-here`;
      expect(getSpaceUrlContext(basePath, '/server-base-path-here')).toEqual('my-awesome-space-lives-here');
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceUrlContext(basePath, '/this/is/a')).toEqual('');
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceUrlContext(basePath, basePath)).toEqual('');
    });
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
