/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLinksFromSignature } from './suricata_links';

describe('suricata_links', () => {
  describe('#getLinksFromSignature', () => {
    test('it should return an empty array when the link does not exist', () => {
      const links = getLinksFromSignature('id-madeup-does-not-exist');
      expect(links).toEqual([]);
    });

    test('it should return a valid unique set of rules (if analyst has added duplicate refs)', () => {
      const links = getLinksFromSignature('2019415');
      expect(links).toEqual([
        'http://cve.mitre.org/cgi-bin/cvename.cgi?name=2014-3566',
        'http://blog.fox-it.com/2014/10/15/poodle/',
        'http://www.openssl.org/~bodo/ssl-poodle.pdf',
        'http://askubuntu.com/questions/537196/how-do-i-patch-workaround-sslv3-poodle-vulnerability-cve-2014-3566',
        'http://www.imperialviolet.org/2014/10/14/poodle.html',
      ]);
    });
  });
});
