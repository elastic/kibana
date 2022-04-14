/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeepLinks } from '.';
import { AppDeepLink, Capabilities } from '../../../../../../src/core/public';
import { SecurityPageName } from '../types';
import { mockGlobalState } from '../../common/mock';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../../common/constants';

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

const basicLicense = 'basic';
const platinumLicense = 'platinum';

describe('deepLinks', () => {
  it('should return a all basic license deep links in the premium deep links', () => {
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
  });

  it('should not return premium deep links in basic license deep links', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense);
    const platinumLinks = getDeepLinks(mockGlobalState.app.enableExperimental, platinumLicense);

    [
      SecurityPageName.hostsAnomalies,
      SecurityPageName.networkAnomalies,
      SecurityPageName.caseConfigure,
    ].forEach((premiumDeepLinkId) => {
      expect(findDeepLink(premiumDeepLinkId, platinumLinks)).toBeTruthy();
      expect(findDeepLink(premiumDeepLinkId, basicLinks)).toBeFalsy();
    });
  });

  it('should return case links for basic license with only read_cases capabilities', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
      [SERVER_APP_ID]: { show: true },
    } as unknown as Capabilities);
    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeTruthy();
  });

  it('should return case links with NO deepLinks for basic license with only read_cases capabilities', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
      [SERVER_APP_ID]: { show: true },
    } as unknown as Capabilities);
    expect(findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length === 0).toBeTruthy();
  });

  it('should return case links with deepLinks for basic license with crud_cases capabilities', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
      [SERVER_APP_ID]: { show: true },
    } as unknown as Capabilities);

    expect(
      (findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  it('should return case links with deepLinks for basic license with crud_cases capabilities and security disabled', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, platinumLicense, {
      [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
      [SERVER_APP_ID]: { show: false },
    } as unknown as Capabilities);
    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeTruthy();
  });

  it('should return NO case links for basic license with NO read_cases capabilities', () => {
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, {
      [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      [SERVER_APP_ID]: { show: true },
    } as unknown as Capabilities);
    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeFalsy();
  });

  it('should return empty links for any license', () => {
    const emptyDeepLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      {} as unknown as Capabilities
    );
    expect(emptyDeepLinks.length).toBe(0);
  });

  it('should return case links for basic license with undefined capabilities', () => {
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(findDeepLink(SecurityPageName.case, basicLinks)).toBeTruthy();
  });

  it('should return case deepLinks for basic license with undefined capabilities', () => {
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(
      (findDeepLink(SecurityPageName.case, basicLinks)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  describe('experimental flags', () => {
    it('should return NO users link when enableExperimental.usersEnabled === false', () => {
      const deepLinks = getDeepLinks({
        ...mockGlobalState.app.enableExperimental,
        usersEnabled: false,
      });

      expect(findDeepLink(SecurityPageName.users, deepLinks)).toBeFalsy();
    });

    it('should return users link when enableExperimental.usersEnabled === true', () => {
      const deepLinks = getDeepLinks({
        ...mockGlobalState.app.enableExperimental,
        usersEnabled: true,
      });
      expect(findDeepLink(SecurityPageName.users, deepLinks)).toBeTruthy();
    });

    it('should NOT return host authentications when enableExperimental.usersEnabled === true', () => {
      const deepLinks = getDeepLinks({
        ...mockGlobalState.app.enableExperimental,
        usersEnabled: true,
      });
      expect(findDeepLink(SecurityPageName.hostsAuthentications, deepLinks)).toBeFalsy();
    });

    it('should return NO detection & Response link when enableExperimental.detectionResponseEnabled === false', () => {
      const deepLinks = getDeepLinks(mockGlobalState.app.enableExperimental);
      expect(findDeepLink(SecurityPageName.detectionAndResponse, deepLinks)).toBeFalsy();
    });

    it('should return detection & Response link when enableExperimental.detectionResponseEnabled === true', () => {
      const deepLinks = getDeepLinks({
        ...mockGlobalState.app.enableExperimental,
        detectionResponseEnabled: true,
      });
      expect(findDeepLink(SecurityPageName.detectionAndResponse, deepLinks)).toBeTruthy();
    });
  });
});
