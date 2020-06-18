/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateUrls } from './validate_urls';

describe('Validate URLS', () => {
  describe('valid URLs', () => {
    it(`doesn't throw for valid URLs`, () => {
      expect(() => validateUrls(['/im/a/little/teapot'])).not.toThrow();
    });

    it(`doesn't throw for valid URLs with #'s`, () => {
      expect(() => validateUrls(['#/im/a/little/teapot'])).not.toThrow();
    });

    it(`doesn't throw for valid URLs with ?'s`, () => {
      expect(() => validateUrls(['?token=wat'])).not.toThrow();
    });
  });

  describe('invalid URLs', () => {
    it(`throws for file protocols`, () => {
      expect(() => validateUrls(['file://me/leet/hacker'])).toThrow();
    });

    it(`throws for absolute URLs`, () => {
      expect(() =>
        validateUrls([
          'http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for JS URLs`, () => {
      expect(() => validateUrls(['javascript:alert(document.cookies)'])).toThrow();
    });

    it(`throws for URLs with protocols`, () => {
      expect(() =>
        validateUrls(['//169.254.169.254/latest/meta-data/iam/security-credentials/profileName'])
      ).toThrow();
    });

    it(`throws for URLs with the triple slash`, () => {
      expect(() =>
        validateUrls(['///169.254.169.254/latest/meta-data/iam/security-credentials/profileName'])
      ).toThrow();
    });

    it(`throws for URLs many slashes`, () => {
      expect(() =>
        validateUrls([
          '//////169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for URLs with spaces`, () => {
      expect(() =>
        validateUrls([
          '  //////169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for URLs with spaces between the protocol`, () => {
      expect(() =>
        validateUrls([
          'http:// 169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for URLs with spaces in different parts`, () => {
      expect(() =>
        validateUrls([
          '  //////  169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for URLs with casing issues`, () => {
      expect(() =>
        validateUrls([
          'Http://169.254.169.254/latest/meta-data/iam/security-credentials/profileName',
        ])
      ).toThrow();
    });

    it(`throws for odd-protocols`, () => {
      expect(() => validateUrls(['chrome://extensions'])).toThrow();
    });

    it(`throws if any URLs are naughty 👿`, () => {
      expect(() => validateUrls(['/im/ok', '/so/am/i', 'wss://but/ima/steal/your/keys'])).toThrow();
    });
  });
});
