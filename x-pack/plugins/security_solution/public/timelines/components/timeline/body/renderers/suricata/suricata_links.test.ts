/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLinksFromSignature, getBeginningTokens } from './suricata_links';

describe('SuricataLinks', () => {
  describe('#getLinksFromSignature', () => {
    test('it should return an empty array when the link does not exist', () => {
      const links = getLinksFromSignature(9999999999);
      expect(links).toEqual([]);
    });

    test('it should return a valid unique set of rules (if analyst has added duplicate refs)', () => {
      const links = getLinksFromSignature(2019415);
      expect(links).toEqual([
        'http://cve.mitre.org/cgi-bin/cvename.cgi?name=2014-3566',
        'http://blog.fox-it.com/2014/10/15/poodle/',
        'http://www.openssl.org/~bodo/ssl-poodle.pdf',
        'http://askubuntu.com/questions/537196/how-do-i-patch-workaround-sslv3-poodle-vulnerability-cve-2014-3566',
        'http://www.imperialviolet.org/2014/10/14/poodle.html',
      ]);
    });
  });

  describe('#getBeginningTokens', () => {
    test('it should return valid tags of ET and PRO', () => {
      const tokens = getBeginningTokens('ET PRO Some Signature');
      expect(tokens).toEqual(['ET', 'PRO']);
    });

    test('it should return valid tags of ET SCAN SHAZAM', () => {
      const tokens = getBeginningTokens('ET SCAN SHAZAM Some Signature');
      expect(tokens).toEqual(['ET', 'SCAN', 'SHAZAM']);
    });

    test('it should return valid tag of GPL', () => {
      const tokens = getBeginningTokens('GPL YeT ANoTHER Signature');
      expect(tokens).toEqual(['GPL']);
    });

    test('it should return valid tags with special characters', () => {
      const tokens = getBeginningTokens('ET IPv4 IPv6 SCAN Rebecca');
      expect(tokens).toEqual(['ET', 'IPv4', 'IPv6', 'SCAN']);
    });

    test('it should NOT return multiple mixed tokens, but only the ones at the beginning', () => {
      const tokens = getBeginningTokens('EVAN BRADEN Hassanabad FRANK');
      expect(tokens).toEqual(['EVAN', 'BRADEN']);
    });

    test('it should return empty tags if there are no tags', () => {
      const tokens = getBeginningTokens('No Tags Here');
      expect(tokens).toEqual([]);
    });

    test('it should return empty tags if any empty string is sent in', () => {
      const tokens = getBeginningTokens('');
      expect(tokens).toEqual([]);
    });

    test('it should return empty tags if a string of all spaces is sent in', () => {
      const tokens = getBeginningTokens('    ');
      expect(tokens).toEqual([]);
    });

    test('it should return empty tags if a signature has extra spaces at the start', () => {
      const tokens = getBeginningTokens('    Hello How are You?');
      expect(tokens).toEqual([]);
    });

    test('it should return empty tags if a signature has extra spaces at the end', () => {
      const tokens = getBeginningTokens('Hello How are You?    ');
      expect(tokens).toEqual([]);
    });

    test('it should return valid tags if a signature has extra spaces at the start', () => {
      const tokens = getBeginningTokens('    HELLO HOW are You?');
      expect(tokens).toEqual(['HELLO', 'HOW']);
    });
  });
});
