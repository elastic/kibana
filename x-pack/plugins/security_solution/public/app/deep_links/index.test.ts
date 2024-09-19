/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeepLinks, PREMIUM_DEEP_LINK_IDS } from '.';
import { AppDeepLink, Capabilities } from '../../../../../../src/core/public';
import { SecurityPageName } from '../types';
import { mockGlobalState } from '../../common/mock';
import { CASES_FEATURE_ID } from '../../../common/constants';

const findDeepLink = (id: string, deepLinks: AppDeepLink[]): AppDeepLink | null =>
  deepLinks.reduce((deepLinkFound: AppDeepLink | null, deepLink) => {
    if (deepLinkFound !== null) {
      return deepLinkFound;
    }
    if (deepLink.id === id) {
      return deepLink;
    }
    if (deepLink.deepLinks) {
      return findDeepLink(id, deepLink.deepLinks);
    }
    return null;
  }, null);

describe('deepLinks', () => {
  it('should return a subset of links for basic license and the full set for platinum', () => {
    const basicLicense = 'basic';
    const platinumLicense = 'platinum';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense);
    const platinumLinks = getDeepLinks(mockGlobalState.app.enableExperimental, platinumLicense);

    const testAllBasicInPlatinum = (
      basicDeepLinks: AppDeepLink[],
      platinumDeepLinks: AppDeepLink[]
    ) => {
      basicDeepLinks.forEach((basicDeepLink) => {
        const platinumDeepLink = platinumDeepLinks.find(({ id }) => id === basicDeepLink.id);
        expect(platinumDeepLink).toBeTruthy();

        if (platinumDeepLink && basicDeepLink.deepLinks) {
          expect(platinumDeepLink.deepLinks).toBeTruthy();

          if (platinumDeepLink.deepLinks) {
            testAllBasicInPlatinum(basicDeepLink.deepLinks, platinumDeepLink.deepLinks);
          }
        }
      });
    };
    testAllBasicInPlatinum(basicLinks, platinumLinks);

    PREMIUM_DEEP_LINK_IDS.forEach((premiumDeepLinkId) => {
      expect(findDeepLink(premiumDeepLinkId, platinumLinks)).toBeTruthy();
      expect(findDeepLink(premiumDeepLinkId, basicLinks)).toBeFalsy();
    });
  });

  it('should return case links for basic license with only read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
    } as unknown as Capabilities);

    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeTruthy();
  });

  it('should return case links with NO deepLinks for basic license with only read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
    } as unknown as Capabilities);
    expect(findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length === 0).toBeTruthy();
  });

  it('should return case links with deepLinks for basic license with crud_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
    } as unknown as Capabilities);

    expect(
      (findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  it('should return NO case links for basic license with NO read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
    } as unknown as Capabilities);

    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeFalsy();
  });

  it('should return case links for basic license with undefined capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeTruthy();
  });

  it('should return case deepLinks for basic license with undefined capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(
      (findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  it('should return NO ueba link when enableExperimental.uebaEnabled === false', () => {
    const deepLinks = getDeepLinks(mockGlobalState.app.enableExperimental);
    expect(findDeepLink(SecurityPageName.ueba, deepLinks)).toBeFalsy();
  });

  it('should return ueba link when enableExperimental.uebaEnabled === true', () => {
    const deepLinks = getDeepLinks({
      ...mockGlobalState.app.enableExperimental,
      uebaEnabled: true,
    });
    expect(findDeepLink(SecurityPageName.ueba, deepLinks)).toBeTruthy();
  });
});
