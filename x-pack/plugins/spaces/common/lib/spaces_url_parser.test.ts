/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_SPACE_ID } from '../constants';
import { addSpaceIdToPath, getSpaceIdFromPath } from './spaces_url_parser';

describe('getSpaceIdFromPath', () => {
  describe('without a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath)).toEqual('my-awesome-space-lives-here');
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath)).toEqual(DEFAULT_SPACE_ID);
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceIdFromPath(basePath)).toEqual(DEFAULT_SPACE_ID);
    });
  });

  describe('with a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/')).toEqual('my-awesome-space-lives-here');
    });

    test('it identifies the space url context following the server base path', () => {
      const basePath = `/server-base-path-here/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/server-base-path-here')).toEqual(
        'my-awesome-space-lives-here'
      );
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/this/is/a')).toEqual(DEFAULT_SPACE_ID);
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceIdFromPath(basePath, basePath)).toEqual(DEFAULT_SPACE_ID);
    });
  });
});

describe('addSpaceIdToPath', () => {
  test('handles no parameters', () => {
    expect(addSpaceIdToPath()).toEqual(`/`);
  });

  test('it adds to the basePath correctly', () => {
    expect(addSpaceIdToPath('/my/base/path', 'url-context')).toEqual('/my/base/path/s/url-context');
  });

  test('it appends the requested path to the end of the url context', () => {
    expect(addSpaceIdToPath('/base', 'context', '/final/destination')).toEqual(
      '/base/s/context/final/destination'
    );
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSpaceIdToPath('', '', 'foo');
    }).toThrowErrorMatchingSnapshot();
  });
});
