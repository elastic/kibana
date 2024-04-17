/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath, getSpaceIdFromPath, stripSpaceIdFromPath } from './spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../constants';

describe('getSpaceIdFromPath', () => {
  describe('without a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath)).toEqual({
        spaceId: 'my-awesome-space-lives-here',
        pathHasExplicitSpaceIdentifier: true,
      });
    });

    test('it identifies the space url context after other known base paths', () => {
      const basePath = `/n/oblt/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath)).toEqual({
        spaceId: 'my-awesome-space-lives-here',
        pathHasExplicitSpaceIdentifier: true,
      });
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath)).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: false,
      });
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceIdFromPath(basePath)).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: false,
      });
    });

    test('it identifies the space url context with the default space', () => {
      const basePath = `/s/${DEFAULT_SPACE_ID}`;
      expect(getSpaceIdFromPath(basePath)).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: true,
      });
    });
  });

  describe('with a serverBasePath defined', () => {
    test('it identifies the space url context', () => {
      const basePath = `/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/')).toEqual({
        spaceId: 'my-awesome-space-lives-here',
        pathHasExplicitSpaceIdentifier: true,
      });
    });

    test('it identifies the space url context following the server base path', () => {
      const basePath = `/server-base-path-here/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/server-base-path-here')).toEqual({
        spaceId: 'my-awesome-space-lives-here',
        pathHasExplicitSpaceIdentifier: true,
      });
    });

    test('ignores space identifiers in the middle of the path', () => {
      const basePath = `/this/is/a/crazy/path/s/my-awesome-space-lives-here`;
      expect(getSpaceIdFromPath(basePath, '/this/is/a')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: false,
      });
    });

    test('it identifies the space url context with the default space following the server base path', () => {
      const basePath = `/server-base-path-here/s/${DEFAULT_SPACE_ID}`;
      expect(getSpaceIdFromPath(basePath, '/server-base-path-here')).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: true,
      });
    });

    test('it handles base url without a space url context', () => {
      const basePath = `/this/is/a/crazy/path/s`;
      expect(getSpaceIdFromPath(basePath, basePath)).toEqual({
        spaceId: DEFAULT_SPACE_ID,
        pathHasExplicitSpaceIdentifier: false,
      });
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

  test('it removes previous space url context before adding the next one', () => {
    expect(
      addSpaceIdToPath('/base/s/previouscontext', 'nextcontext', '/final/destination')
    ).toEqual('/base/s/nextcontext/final/destination');
  });

  test('it throws an error when the requested path does not start with a slash', () => {
    expect(() => {
      addSpaceIdToPath('', '', 'foo');
    }).toThrowErrorMatchingInlineSnapshot(`"path must start with a /"`);
  });
});

describe('stripSpaceIdFromPath', () => {
  test('it removes basePath correctly', () => {
    expect(stripSpaceIdFromPath('/s/foo/n/oblt/app')).toEqual('/n/oblt/app');
  });

  test('it does not remove in the middle of the path', () => {
    expect(stripSpaceIdFromPath('/app/s/foo')).toEqual('/app/s/foo');
  });

  test('it preserves other known basePaths', () => {
    expect(stripSpaceIdFromPath('/n/oblt/s/foo/app')).toEqual('/n/oblt/app');
  });
});
