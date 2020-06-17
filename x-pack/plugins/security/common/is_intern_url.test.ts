/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isInternalURL } from './is_internal_url';

describe('isInternalURL', () => {
  function commonTestCases(basePath?: string) {
    it('should return `true `if URL includes hash fragment', () => {
      const href = `${basePath}/app/kibana#/discover/New-Saved-Search`;
      expect(isInternalURL(href, basePath)).toBe(true);
    });

    it('should return `false` if URL includes a protocol/hostname', () => {
      const href = `https://example.com${basePath}/app/kibana`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });

    it('should return `false` if URL includes a port', () => {
      const href = `http://localhost:5601${basePath}/app/kibana`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });

    it('should return `false` if URL does not specify protocol', () => {
      const hrefWithTwoSlashes = `//${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithTwoSlashes)).toBe(false);

      const hrefWithThreeSlashes = `///${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithThreeSlashes)).toBe(false);
    });
  }

  describe('with basePath defined', () => {
    const basePath = '/iqf';

    commonTestCases(basePath);

    it('should return `true` if URL starts with a basepath', () => {
      const href = `${basePath}/login`;
      expect(isInternalURL(href, basePath)).toBe(true);
    });

    it('should return `false` if URL does not start with basePath', () => {
      const href = '/notbasepath/app/kibana';
      expect(isInternalURL(href, basePath)).toBe(false);
    });
  });

  describe('without basePath defined', () => commonTestCases());
});
