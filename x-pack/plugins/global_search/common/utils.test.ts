/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertResultUrl } from './utils';

const createBasePath = () => ({
  prepend: jest.fn(),
});

describe('convertResultUrl', () => {
  let basePath: ReturnType<typeof createBasePath>;

  beforeEach(() => {
    basePath = createBasePath();
    basePath.prepend.mockImplementation((path) => `/base-path${path}`);
  });

  describe('when the url is a string', () => {
    it('does not convert absolute urls', () => {
      expect(convertResultUrl('http://kibana:8080/foo/bar', basePath)).toEqual(
        'http://kibana:8080/foo/bar'
      );
      expect(convertResultUrl('https://localhost/path/to/thing', basePath)).toEqual(
        'https://localhost/path/to/thing'
      );
      expect(basePath.prepend).toHaveBeenCalledTimes(0);
    });

    it('prepends the base path to relative urls', () => {
      expect(convertResultUrl('/app/my-app/foo', basePath)).toEqual('/base-path/app/my-app/foo');
      expect(basePath.prepend).toHaveBeenCalledTimes(1);
      expect(basePath.prepend).toHaveBeenCalledWith('/app/my-app/foo');

      expect(convertResultUrl('/some-path', basePath)).toEqual('/base-path/some-path');
      expect(basePath.prepend).toHaveBeenCalledTimes(2);
      expect(basePath.prepend).toHaveBeenCalledWith('/some-path');
    });
  });

  describe('when the url is an object', () => {
    it('converts the path if `prependBasePath` is true', () => {
      expect(convertResultUrl({ path: '/app/my-app', prependBasePath: true }, basePath)).toEqual(
        '/base-path/app/my-app'
      );
      expect(basePath.prepend).toHaveBeenCalledTimes(1);
      expect(basePath.prepend).toHaveBeenCalledWith('/app/my-app');

      expect(convertResultUrl({ path: '/some-path', prependBasePath: true }, basePath)).toEqual(
        '/base-path/some-path'
      );
      expect(basePath.prepend).toHaveBeenCalledTimes(2);
      expect(basePath.prepend).toHaveBeenCalledWith('/some-path');
    });
    it('does not convert the path if `prependBasePath` is false', () => {
      expect(convertResultUrl({ path: '/app/my-app', prependBasePath: false }, basePath)).toEqual(
        '/app/my-app'
      );
      expect(convertResultUrl({ path: '/some-path', prependBasePath: false }, basePath)).toEqual(
        '/some-path'
      );
      expect(basePath.prepend).toHaveBeenCalledTimes(0);
    });
  });
});
