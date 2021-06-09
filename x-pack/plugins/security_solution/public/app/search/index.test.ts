/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeepLinksAndKeywords } from '.';
import { SecurityPageName } from '../../../common/constants';

describe('public search functions', () => {
  it('returns a subset of links for basic license, full set for platinum', () => {
    const basicLicense = 'basic';
    const platinumLicense = 'platinum';
    for (const pageName of Object.values(SecurityPageName)) {
      expect.assertions(Object.values(SecurityPageName).length * 2);
      const basicLinkCount = getDeepLinksAndKeywords(pageName, basicLicense).deepLinks?.length || 0;
      const platinumLinks = getDeepLinksAndKeywords(pageName, platinumLicense);
      expect(platinumLinks.deepLinks?.length).toBeGreaterThanOrEqual(basicLinkCount);
      expect(platinumLinks.keywords?.length).not.toBe(null);
    }
  });
});
