/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getLinksFromSignature } from './suricata_links';

describe('suricata_links', () => {
  describe('#getLinksFromSignature', () => {
    test('it should return an empty array when the link does not exist', () => {
      const links = getLinksFromSignature('madeup-does-not-exist');
      expect(links).toEqual([]);
    });
  });
});
