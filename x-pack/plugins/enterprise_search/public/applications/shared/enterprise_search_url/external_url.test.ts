/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { externalUrl, getEnterpriseSearchUrl, getAppSearchUrl, getWorkplaceSearchUrl } from '.';

describe('Enterprise Search external URL helpers', () => {
  describe('getter/setter tests', () => {
    it('defaults to an empty string', () => {
      expect(externalUrl.enterpriseSearchUrl).toEqual('');
    });

    it('sets the internal enterpriseSearchUrl value', () => {
      externalUrl.enterpriseSearchUrl = 'http://localhost:3002';
      expect(externalUrl.enterpriseSearchUrl).toEqual('http://localhost:3002');
    });

    it('does not allow mutating enterpriseSearchUrl once set', () => {
      externalUrl.enterpriseSearchUrl = 'hello world';
      expect(externalUrl.enterpriseSearchUrl).toEqual('http://localhost:3002');
    });
  });

  describe('function helpers', () => {
    it('generates a public Enterprise Search URL', () => {
      expect(getEnterpriseSearchUrl()).toEqual('http://localhost:3002');
      expect(getEnterpriseSearchUrl('/login')).toEqual('http://localhost:3002/login');
    });

    it('generates a public App Search URL', () => {
      expect(getAppSearchUrl()).toEqual('http://localhost:3002/as');
      expect(getAppSearchUrl('/path')).toEqual('http://localhost:3002/as/path');
    });

    it('generates a public Workplace Search URL', () => {
      expect(getWorkplaceSearchUrl()).toEqual('http://localhost:3002/ws');
      expect(getWorkplaceSearchUrl('/path')).toEqual('http://localhost:3002/ws/path');
    });
  });
});
