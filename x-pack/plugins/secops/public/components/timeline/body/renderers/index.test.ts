/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLinkWithSignature, getSuricataCVEFromSignature } from '.';

describe('index', () => {
  describe('#getSuricataCVEFromSignature', () => {
    test('should parse a basic CVE string by its self', () => {
      const cve = getSuricataCVEFromSignature('CVE-123-123');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string in the middle of a signature', () => {
      const cve = getSuricataCVEFromSignature(
        'I am a normal signature and this is CVE-123-123 for you'
      );
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string at the beginning of a signature', () => {
      const cve = getSuricataCVEFromSignature('CVE-123-123 I am a normal signature for you.');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string at the end of a signature', () => {
      const cve = getSuricataCVEFromSignature('I am a normal signature for you. CVE-123-123');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in a signature at the end', () => {
      const cve = getSuricataCVEFromSignature('I am a normal signature for youCVE-123-123');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in a signature at the beginning', () => {
      const cve = getSuricataCVEFromSignature('CVE-123-123I am a normal signature for you');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in the middle of a word', () => {
      const cve = getSuricataCVEFromSignature('I am a normalCVE-123-123signature for you');
      expect(cve).toEqual('CVE-123-123');
    });

    test('should return a null if a CVE is not present', () => {
      const cve = getSuricataCVEFromSignature('I am a normal signature for you');
      expect(cve).toBeNull();
    });

    test('should return  a null if the signature is empty', () => {
      const cve = getSuricataCVEFromSignature();
      expect(cve).toBeNull();
    });
  });

  describe('#createLinkWithSignature', () => {
    test('should parse a basic CVE string by its self as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('CVE-123-123');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string in the middle of a signature as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature(
        'I am a normal signature and this is CVE-123-123 for you'
      );
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string at the beginning of a signature as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('CVE-123-123 I am a normal signature for you.');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string at the end of a signature as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('I am a normal signature for you. CVE-123-123');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in a signature at the end as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('I am a normal signature for youCVE-123-123');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in a signature at the beginning as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('CVE-123-123I am a normal signature for you');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a basic CVE string with no spaces mixed in the middle of a word as a hyper link to cve.mitre.org', () => {
      const cve = createLinkWithSignature('I am a normalCVE-123-123signature for you');
      expect(cve).toEqual('https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-123-123');
    });

    test('should parse a link to google.com with no CVE in the signature', () => {
      const cve = createLinkWithSignature('I am a normal signature for you');
      expect(cve).toEqual(
        'https://www.google.com/search?q=I%20am%20a%20normal%20signature%20for%20you'
      );
    });
  });
});
