/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateCloudUrl,
  convertCloudUrlToProxyConnection,
  i18nTexts,
} from './cloud_deployment_url';
describe('Cloud deployment url', () => {
  describe('validation', () => {
    it('errors when the url is empty', () => {
      const actual = validateCloudUrl('');
      expect(actual).toBe(i18nTexts.urlInvalid);
    });

    it('errors when the url is invalid', () => {
      const actual = validateCloudUrl('invalid%url');
      expect(actual).toBe(i18nTexts.urlInvalid);
    });
  });

  describe('conversion', () => {
    it('empty url to empty proxy connection values', () => {
      const actual = convertCloudUrlToProxyConnection('');
      expect(actual).toEqual({ proxyAddress: '', serverName: '' });
    });

    it('url with protocol and port to proxy connection values', () => {
      const actual = convertCloudUrlToProxyConnection('http://test.com:1234');
      expect(actual).toEqual({ proxyAddress: 'test.com:9400', serverName: 'test.com' });
    });

    it('url with protocol and no port to proxy connection values', () => {
      const actual = convertCloudUrlToProxyConnection('http://test.com');
      expect(actual).toEqual({ proxyAddress: 'test.com:9400', serverName: 'test.com' });
    });

    it('url with no protocol to proxy connection values', () => {
      const actual = convertCloudUrlToProxyConnection('test.com');
      expect(actual).toEqual({ proxyAddress: 'test.com:9400', serverName: 'test.com' });
    });
    it('invalid url to empty proxy connection values', () => {
      const actual = convertCloudUrlToProxyConnection('invalid%url');
      expect(actual).toEqual({ proxyAddress: '', serverName: '' });
    });
  });
});
