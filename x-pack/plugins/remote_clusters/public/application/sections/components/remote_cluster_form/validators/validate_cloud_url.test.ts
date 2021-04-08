/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isCloudUrlEnabled,
  validateCloudUrl,
  convertCloudUrlToProxyConnection,
  convertProxyConnectionToCloudUrl,
  i18nTexts,
} from './validate_cloud_url';

describe('Cloud url', () => {
  describe('validation', () => {
    it('errors when the url is empty', () => {
      const actual = validateCloudUrl('');
      expect(actual).toBe(i18nTexts.urlEmpty);
    });

    it('errors when the url is invalid', () => {
      const actual = validateCloudUrl('invalid%url');
      expect(actual).toBe(i18nTexts.urlInvalid);
    });
  });

  describe('is cloud url', () => {
    it('true for a new cluster', () => {
      const actual = isCloudUrlEnabled();
      expect(actual).toBe(true);
    });

    it('true when proxy connection is empty', () => {
      const actual = isCloudUrlEnabled({ name: 'test', proxyAddress: '', serverName: '' });
      expect(actual).toBe(true);
    });

    it('true when proxy address is the same as server name and default port', () => {
      const actual = isCloudUrlEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:9400',
        serverName: 'some-proxy',
      });
      expect(actual).toBe(true);
    });
    it('false when proxy address is the same as server name but not default port', () => {
      const actual = isCloudUrlEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:1234',
        serverName: 'some-proxy',
      });
      expect(actual).toBe(false);
    });
    it('true when proxy address is  not the same as server name', () => {
      const actual = isCloudUrlEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:9400',
        serverName: 'some-server-name',
      });
      expect(actual).toBe(false);
    });
  });
  describe('conversion from cloud url', () => {
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

  describe('conversion to cloud url', () => {
    it('empty proxy address to empty cloud url', () => {
      const actual = convertProxyConnectionToCloudUrl({
        name: 'test',
        proxyAddress: '',
        serverName: 'test',
      });
      expect(actual).toEqual('');
    });

    it('empty server name to empty cloud url', () => {
      const actual = convertProxyConnectionToCloudUrl({
        name: 'test',
        proxyAddress: 'test',
        serverName: '',
      });
      expect(actual).toEqual('');
    });

    it('different proxy address and server name to empty cloud url', () => {
      const actual = convertProxyConnectionToCloudUrl({
        name: 'test',
        proxyAddress: 'test',
        serverName: 'another-test',
      });
      expect(actual).toEqual('');
    });

    it('valid proxy connection to cloud url', () => {
      const actual = convertProxyConnectionToCloudUrl({
        name: 'test',
        proxyAddress: 'test-proxy:9400',
        serverName: 'test-proxy',
      });
      expect(actual).toEqual('test-proxy');
    });
  });
});
