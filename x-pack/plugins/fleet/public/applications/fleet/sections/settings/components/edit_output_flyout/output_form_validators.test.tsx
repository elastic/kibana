/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateESHosts,
  validateLogstashHosts,
  validateYamlConfig,
  validateCATrustedFingerPrint,
} from './output_form_validators';

describe('Output form validation', () => {
  describe('validateESHosts', () => {
    it('should not work without any urls', () => {
      const res = validateESHosts([]);

      expect(res).toEqual([{ message: 'URL is required' }]);
    });

    it('should work with valid url', () => {
      const res = validateESHosts(['https://test.fr:9200']);

      expect(res).toBeUndefined();
    });

    it('should return an error with invalid url', () => {
      const res = validateESHosts(['toto']);

      expect(res).toEqual([{ index: 0, message: 'Invalid URL' }]);
    });

    it('should return an error with url with invalid port', () => {
      const res = validateESHosts(['https://test.fr:qwerty9200']);

      expect(res).toEqual([{ index: 0, message: 'Invalid URL' }]);
    });

    it('should return an error with multiple invalid urls', () => {
      const res = validateESHosts(['toto', 'tata']);

      expect(res).toEqual([
        { index: 0, message: 'Invalid URL' },
        { index: 1, message: 'Invalid URL' },
      ]);
    });
    it('should return an error with duplicate urls', () => {
      const res = validateESHosts(['http://test.fr', 'http://test.fr']);

      expect(res).toEqual([
        { index: 0, message: 'Duplicate URL' },
        { index: 1, message: 'Duplicate URL' },
      ]);
    });
  });

  describe('validateLogstashHosts', () => {
    it('should not work without any urls', () => {
      const res = validateLogstashHosts([]);

      expect(res).toEqual([{ message: 'Host is required' }]);
    });

    it('should work for valid hosts', () => {
      const res = validateLogstashHosts(['test.fr:5044']);

      expect(res).toBeUndefined();
    });
    it('should throw for invalid hosts starting with http', () => {
      const res = validateLogstashHosts(['https://test.fr:5044']);

      expect(res).toEqual([
        { index: 0, message: 'Host URL must begin with a domain name or IP address.' },
      ]);
    });

    it('should throw for invalid host', () => {
      const res = validateLogstashHosts(['$#!$!@#!@#@!#!@#@#:!@#!@#']);

      expect(res).toEqual([{ index: 0, message: 'Invalid Host' }]);
    });
  });
  describe('validateYamlConfig', () => {
    it('should work with an empty yaml', () => {
      const res = validateYamlConfig(``);

      expect(res).toBeUndefined();
    });

    it('should work with valid yaml', () => {
      const res = validateYamlConfig(`test: 123`);

      expect(res).toBeUndefined();
    });

    it('should return an error with invalid yaml', () => {
      const res = validateYamlConfig(`{}}`);

      expect(res).toBeDefined();
      if (typeof res !== 'undefined') {
        expect(res[0]).toContain('Invalid YAML: ');
      }
    });
  });
  describe('validate', () => {
    it('should work with a valid fingerprint', () => {
      const res = validateCATrustedFingerPrint(
        '9f0a10411457adde3982ef01df20d2e7aa53a8ef29c50bcbfa3f3e93aebf631b'
      );

      expect(res).toBeUndefined();
    });

    it('should return an error with a invalid formatted fingerprint', () => {
      const res = validateCATrustedFingerPrint(
        '9F:0A:10:41:14:57:AD:DE:39:82:EF:01:DF:20:D2:E7:AA:53:A8:EF:29:C5:0B:CB:FA:3F:3E:93:AE:BF:63:1B'
      );

      expect(res).toEqual(['CA trusted fingerprint should be a base64 CA sha256 fingerprint']);
    });
  });
});
