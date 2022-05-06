/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAncestorLinksInfo,
  getDeepLinks,
  getInitialDeepLinks,
  getLinkInfo,
  getNavLinkItems,
  needsUrlState,
} from './links';
import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';
import { Capabilities } from '@kbn/core/types';
import { AppDeepLink } from '@kbn/core/public';
import { mockGlobalState } from '../mock';
import { NavLinkItem } from './types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { LicenseType } from '@kbn/licensing-plugin/common/types';

const mockExperimentalDefaults = mockGlobalState.app.enableExperimental;
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

const findNavLink = (id: SecurityPageName, navLinks: NavLinkItem[]): NavLinkItem | null =>
  navLinks.reduce((deepLinkFound: NavLinkItem | null, deepLink) => {
    if (deepLinkFound !== null) {
      return deepLinkFound;
    }
    if (deepLink.id === id) {
      return deepLink;
    }
    if (deepLink.links) {
      return findNavLink(id, deepLink.links);
    }
    return null;
  }, null);

// remove filter once new nav is live
const allPages = Object.values(SecurityPageName).filter(
  (pageName) =>
    pageName !== SecurityPageName.explore &&
    pageName !== SecurityPageName.detections &&
    pageName !== SecurityPageName.investigate
);
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
  let licenseMock: ReturnType<typeof licensingMock.createLicenseMock>;
  const licenseBasicMock = jest.fn().mockImplementation((arg: LicenseType) => arg === 'basic');

  beforeEach(() => {
    licenseMock = licensingMock.createLicenseMock();
  });
  describe('getInitialDeepLinks', () => {
    it('should return all pages in the app', () => {
      const links = getInitialDeepLinks();
      allPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
    });
  });
  describe('getDeepLinks', () => {
    it('basicLicense should return only basic links', async () => {
      licenseMock.hasAtLeast = licenseBasicMock;
      const links = await getDeepLinks({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities: mockCapabilities,
      });
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
    it('platinumLicense should return all links', async () => {
      const links = await getDeepLinks({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities: mockCapabilities,
      });
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
    it('hideWhenExperimentalKey hides entry when key = true', async () => {
      const links = await getDeepLinks({
        enableExperimental: { ...mockExperimentalDefaults, usersEnabled: true },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findDeepLink(SecurityPageName.hostsAuthentications, links)).toBeFalsy();
    });
    it('hideWhenExperimentalKey shows entry when key = false', async () => {
      const links = await getDeepLinks({
        enableExperimental: { ...mockExperimentalDefaults, usersEnabled: false },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findDeepLink(SecurityPageName.hostsAuthentications, links)).toBeTruthy();
    });
    it('experimentalKey shows entry when key = false', async () => {
      const links = await getDeepLinks({
        enableExperimental: {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: false,
          riskyUsersEnabled: false,
          detectionResponseEnabled: false,
        },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findDeepLink(SecurityPageName.hostsRisk, links)).toBeFalsy();
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeFalsy();
      expect(findDeepLink(SecurityPageName.detectionAndResponse, links)).toBeFalsy();
    });
    it('experimentalKey shows entry when key = true', async () => {
      const links = await getDeepLinks({
        enableExperimental: {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: true,
          riskyUsersEnabled: true,
          detectionResponseEnabled: true,
        },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findDeepLink(SecurityPageName.hostsRisk, links)).toBeTruthy();
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeTruthy();
      expect(findDeepLink(SecurityPageName.detectionAndResponse, links)).toBeTruthy();
    });

    it('Removes siem features when siem capabilities are false', async () => {
      const capabilities = {
        ...mockCapabilities,
        [SERVER_APP_ID]: { show: false },
      } as unknown as Capabilities;
      const links = await getDeepLinks({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities,
      });
      nonCasesPages.forEach((page) => {
        // investigate is active for both Cases and Timelines pages
        if (page === SecurityPageName.investigate) {
          return expect(findDeepLink(page, links)).toBeTruthy();
        }
        return expect(findDeepLink(page, links)).toBeFalsy();
      });
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
    });
    it('Removes cases features when cases capabilities are false', async () => {
      const capabilities = {
        ...mockCapabilities,
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities;
      const links = await getDeepLinks({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities,
      });
      nonCasesPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeFalsy());
    });
  });

  describe('getNavLinkItems', () => {
    it('basicLicense should return only basic links', () => {
      licenseMock.hasAtLeast = licenseBasicMock;
      const links = getNavLinkItems({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findNavLink(SecurityPageName.hostsAnomalies, links)).toBeFalsy();
      allPages.forEach((page) => {
        if (premiumPages.includes(page)) {
          return expect(findNavLink(page, links)).toBeFalsy();
        }
        if (featureFlagPages.includes(page)) {
          // ignore feature flag pages
          return;
        }
        expect(findNavLink(page, links)).toBeTruthy();
      });
    });
    it('platinumLicense should return all links', () => {
      const links = getNavLinkItems({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      allPages.forEach((page) => {
        if (premiumPages.includes(page) && !featureFlagPages.includes(page)) {
          return expect(findNavLink(page, links)).toBeTruthy();
        }
        if (featureFlagPages.includes(page)) {
          // ignore feature flag pages
          return;
        }
        expect(findNavLink(page, links)).toBeTruthy();
      });
    });
    it('hideWhenExperimentalKey hides entry when key = true', () => {
      const links = getNavLinkItems({
        enableExperimental: { ...mockExperimentalDefaults, usersEnabled: true },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findNavLink(SecurityPageName.hostsAuthentications, links)).toBeFalsy();
    });
    it('hideWhenExperimentalKey shows entry when key = false', () => {
      const links = getNavLinkItems({
        enableExperimental: { ...mockExperimentalDefaults, usersEnabled: false },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findNavLink(SecurityPageName.hostsAuthentications, links)).toBeTruthy();
    });
    it('experimentalKey shows entry when key = false', () => {
      const links = getNavLinkItems({
        enableExperimental: {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: false,
          riskyUsersEnabled: false,
          detectionResponseEnabled: false,
        },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findNavLink(SecurityPageName.hostsRisk, links)).toBeFalsy();
      expect(findNavLink(SecurityPageName.usersRisk, links)).toBeFalsy();
      expect(findNavLink(SecurityPageName.detectionAndResponse, links)).toBeFalsy();
    });
    it('experimentalKey shows entry when key = true', () => {
      const links = getNavLinkItems({
        enableExperimental: {
          ...mockExperimentalDefaults,
          riskyHostsEnabled: true,
          riskyUsersEnabled: true,
          detectionResponseEnabled: true,
        },
        license: licenseMock,
        capabilities: mockCapabilities,
      });
      expect(findNavLink(SecurityPageName.hostsRisk, links)).toBeTruthy();
      expect(findNavLink(SecurityPageName.usersRisk, links)).toBeTruthy();
      expect(findNavLink(SecurityPageName.detectionAndResponse, links)).toBeTruthy();
    });

    it('Removes siem features when siem capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [SERVER_APP_ID]: { show: false },
      } as unknown as Capabilities;
      const links = getNavLinkItems({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities,
      });
      nonCasesPages.forEach((page) => {
        // investigate is active for both Cases and Timelines pages
        if (page === SecurityPageName.investigate) {
          return expect(findNavLink(page, links)).toBeTruthy();
        }
        return expect(findNavLink(page, links)).toBeFalsy();
      });
      casesPages.forEach((page) => expect(findNavLink(page, links)).toBeTruthy());
    });
    it('Removes cases features when cases capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities;
      const links = getNavLinkItems({
        enableExperimental: mockExperimentalDefaults,
        license: licenseMock,
        capabilities,
      });
      nonCasesPages.forEach((page) => expect(findNavLink(page, links)).toBeTruthy());
      casesPages.forEach((page) => expect(findNavLink(page, links)).toBeFalsy());
    });
  });

  describe('getAncestorLinksInfo', () => {
    it('finds flattened links for hosts', () => {
      const hierarchy = getAncestorLinksInfo(SecurityPageName.hosts);
      expect(hierarchy).toEqual([
        {
          features: ['siem.show'],
          globalNavEnabled: false,
          globalSearchKeywords: ['Threat hunting'],
          id: 'threat-hunting',
          path: '/threat_hunting',
          title: 'Threat Hunting',
        },
        {
          globalNavEnabled: true,
          globalNavOrder: 9002,
          globalSearchEnabled: true,
          globalSearchKeywords: ['Hosts'],
          id: 'hosts',
          path: '/hosts',
          title: 'Hosts',
        },
      ]);
    });
    it('finds flattened links for uncommonProcesses', () => {
      const hierarchy = getAncestorLinksInfo(SecurityPageName.uncommonProcesses);
      expect(hierarchy).toEqual([
        {
          features: ['siem.show'],
          globalNavEnabled: false,
          globalSearchKeywords: ['Threat hunting'],
          id: 'threat-hunting',
          path: '/threat_hunting',
          title: 'Threat Hunting',
        },
        {
          globalNavEnabled: true,
          globalNavOrder: 9002,
          globalSearchEnabled: true,
          globalSearchKeywords: ['Hosts'],
          id: 'hosts',
          path: '/hosts',
          title: 'Hosts',
        },
        {
          id: 'uncommon_processes',
          path: '/hosts/uncommonProcesses',
          title: 'Uncommon Processes',
        },
      ]);
    });
  });

  describe('needsUrlState', () => {
    it('returns true when url state exists for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hosts);
      expect(needsUrl).toEqual(true);
    });
    it('returns false when url state does not exist for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.landing);
      expect(needsUrl).toEqual(false);
    });
  });

  describe('getLinkInfo', () => {
    it('gets information for an individual link', () => {
      const linkInfo = getLinkInfo(SecurityPageName.hosts);
      expect(linkInfo).toEqual({
        globalNavEnabled: true,
        globalNavOrder: 9002,
        globalSearchEnabled: true,
        globalSearchKeywords: ['Hosts'],
        id: 'hosts',
        path: '/hosts',
        title: 'Hosts',
      });
    });
  });
});
