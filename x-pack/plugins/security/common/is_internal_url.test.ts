/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isInternalURL } from './is_internal_url';

describe('isInternalURL', () => {
  describe('with basePath defined', () => {
    const basePath = '/iqf';

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
      const hrefWithTwoSlashes = `/${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithTwoSlashes)).toBe(false);

      const hrefWithThreeSlashes = `//${basePath}/app/kibana`;
      expect(isInternalURL(hrefWithThreeSlashes)).toBe(false);
    });

    it('should return `true` if URL starts with a basepath', () => {
      for (const href of [basePath, `${basePath}/`, `${basePath}/login`, `${basePath}/login/`]) {
        expect(isInternalURL(href, basePath)).toBe(true);
      }
    });

    it('should return `false` if URL does not start with basePath', () => {
      for (const href of [
        '/notbasepath/app/kibana',
        `${basePath}_/login`,
        basePath.slice(1),
        `${basePath.slice(1)}/app/kibana`,
      ]) {
        expect(isInternalURL(href, basePath)).toBe(false);
      }
    });

    it('should return `true` if relative path does not escape base path', () => {
      const href = `${basePath}/app/kibana/../../management`;
      expect(isInternalURL(href, basePath)).toBe(true);
    });

    it('should return `false` if relative path escapes base path', () => {
      const href = `${basePath}/app/kibana/../../../management`;
      expect(isInternalURL(href, basePath)).toBe(false);
    });
  });

  describe('without basePath defined', () => {
    it('should return `true `if URL includes hash fragment', () => {
      const href = '/app/kibana#/discover/New-Saved-Search';
      expect(isInternalURL(href)).toBe(true);
    });

    it('should return `false` if URL includes a protocol/hostname', () => {
      const href = 'https://example.com/app/kibana';
      expect(isInternalURL(href)).toBe(false);
    });

    it('should return `false` if URL includes a port', () => {
      const href = 'http://localhost:5601/app/kibana';
      expect(isInternalURL(href)).toBe(false);
    });

    it('should return `false` if URL does not specify protocol', () => {
      const hrefWithTwoSlashes = `//app/kibana`;
      expect(isInternalURL(hrefWithTwoSlashes)).toBe(false);

      const hrefWithThreeSlashes = `///app/kibana`;
      expect(isInternalURL(hrefWithThreeSlashes)).toBe(false);
    });
  });
});
