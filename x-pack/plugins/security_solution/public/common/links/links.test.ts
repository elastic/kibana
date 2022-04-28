/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeepLinks, getInitialDeepLinks, getNavTabs, needsUrlState } from './links';
import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';
import { Capabilities } from '@kbn/core/types';
import { AppDeepLink } from '@kbn/core/public';
import { mockGlobalState } from '../mock';
import { navTabs as navTabsArtifact } from '../../app/home/home_navigations';

const mockExperimentalDefaults = mockGlobalState.app.enableExperimental;
const basicLicense = 'basic';
const platinumLicense = 'platinum';
const mockCapabilities = {
  [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
  [SERVER_APP_ID]: { show: true },
} as unknown as Capabilities;

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

const allPages = Object.values(SecurityPageName);
const casesPages = [
  SecurityPageName.case,
  SecurityPageName.caseConfigure,
  SecurityPageName.caseCreate,
];
const featureFlagPages = [
  SecurityPageName.detectionAndResponse,
  SecurityPageName.hostsAuthentications,
  SecurityPageName.hostsRisk,
  SecurityPageName.usersRisk,
];
const premiumPages = [
  SecurityPageName.caseConfigure,
  SecurityPageName.hostsAnomalies,
  SecurityPageName.networkAnomalies,
  SecurityPageName.usersAnomalies,
  SecurityPageName.detectionAndResponse,
  SecurityPageName.hostsRisk,
  SecurityPageName.usersRisk,
];
const nonCasesPages = allPages.reduce(
  (acc: SecurityPageName[], p) =>
    casesPages.includes(p) || featureFlagPages.includes(p) ? acc : [p, ...acc],
  []
);
describe('security app link helpers', () => {
  describe('getInitialDeepLinks', () => {
    it('should return all pages in the app', () => {
      const links = getInitialDeepLinks();
      allPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
    });
  });
  describe('getDeepLinks', () => {
    it('basicLicense should return only basic links', () => {
      const links = getDeepLinks(mockExperimentalDefaults, basicLicense, mockCapabilities);
      expect(findDeepLink(SecurityPageName.hostsAnomalies, links)).toBeFalsy();
      allPages.forEach((page) => {
        if (premiumPages.includes(page)) {
          return expect(findDeepLink(page, links)).toBeFalsy();
        }
        if (featureFlagPages.includes(page)) {
          // ignore feature flag pages
          return;
        }
        expect(findDeepLink(page, links)).toBeTruthy();
      });
    });
    it('platinumLicense should return all links', () => {
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, mockCapabilities);
      allPages.forEach((page) => {
        if (premiumPages.includes(page) && !featureFlagPages.includes(page)) {
          return expect(findDeepLink(page, links)).toBeTruthy();
        }
        if (featureFlagPages.includes(page)) {
          // ignore feature flag pages
          return;
        }
        expect(findDeepLink(page, links)).toBeTruthy();
      });
    });
    it('hideWhenExperimentalKey hides entry when key = true', () => {
      const links = getDeepLinks(
        { ...mockExperimentalDefaults, usersEnabled: true },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.hostsAuthentications, links)).toBeFalsy();
    });
    it('hideWhenExperimentalKey shows entry when key = false', () => {
      const links = getDeepLinks(
        { ...mockExperimentalDefaults, usersEnabled: false },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.hostsAuthentications, links)).toBeTruthy();
    });
    it('experimentalKey shows entry when key = false', () => {
      const links = getDeepLinks(
        {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: false,
          riskyUsersEnabled: false,
          detectionResponseEnabled: false,
        },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.hostsRisk, links)).toBeFalsy();
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeFalsy();
      expect(findDeepLink(SecurityPageName.detectionAndResponse, links)).toBeFalsy();
    });
    it('experimentalKey shows entry when key = true', () => {
      const links = getDeepLinks(
        {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: true,
          riskyUsersEnabled: true,
          detectionResponseEnabled: true,
        },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.hostsRisk, links)).toBeTruthy();
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeTruthy();
      expect(findDeepLink(SecurityPageName.detectionAndResponse, links)).toBeTruthy();
    });

    it('Removes siem features when siem capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [SERVER_APP_ID]: { show: false },
      } as unknown as Capabilities;
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, capabilities);
      nonCasesPages.forEach((page) => {
        // investigate is active for both Cases and Timelines pages
        if (page === SecurityPageName.investigate) {
          return expect(findDeepLink(page, links)).toBeTruthy();
        }
        return expect(findDeepLink(page, links)).toBeFalsy();
      });
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
    });
    it('Removes cases features when cases capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities;
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, capabilities);
      nonCasesPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeFalsy());
    });
  });
  describe('getNavTabs', () => {
    it('return default SecurityNav tab object when no argument', () => {
      const navTabs = getNavTabs();
      expect(navTabs).toEqual(navTabsArtifact);
    });
    it('return custom SecurityNav tab object with page arguments', () => {
      const navTabs = getNavTabs([
        SecurityPageName.uncommonProcesses,
        SecurityPageName.caseConfigure,
      ]);
      expect(navTabs).toEqual({
        [SecurityPageName.uncommonProcesses]: {
          disabled: false,
          href: '/app/security/hosts/uncommonProcesses',
          id: SecurityPageName.uncommonProcesses,
          name: 'Uncommon Processes',
          urlKey: 'host',
        },
        [SecurityPageName.caseConfigure]: {
          disabled: false,
          href: '/app/security/cases/configure',
          id: SecurityPageName.caseConfigure,
          name: 'Configure Cases',
          urlKey: undefined,
        },
      });
    });
  });
  describe('needsUrlState', () => {
    it('returns true when url state exists for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hosts);
      expect(needsUrl).toEqual(true);
    });
    it('returns false when url state does not exist for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.caseConfigure);
      expect(needsUrl).toEqual(false);
    });
  });
});
