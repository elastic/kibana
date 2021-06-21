/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeepLinks } from '.';

describe('public search functions', () => {
  it('returns a subset of links for basic license, full set for platinum', () => {
    const basicLicense = 'basic';
    const platinumLicense = 'platinum';
    const basicLinks = getDeepLinks(basicLicense);
    const platinumLinks = getDeepLinks(platinumLicense);

    basicLinks.forEach((basicLink, index) => {
      const platinumLink = platinumLinks[index];
      expect(basicLink.id).toEqual(platinumLink.id);
      const platinumDeepLinksCount = platinumLink.deepLinks?.length || 0;
      const basicDeepLinksCount = basicLink.deepLinks?.length || 0;
      expect(platinumDeepLinksCount).toBeGreaterThanOrEqual(basicDeepLinksCount);
    });
  });
});
