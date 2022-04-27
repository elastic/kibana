/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeepLinks, getInitialDeepLinks } from './links';
import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';
import { Capabilities } from '@kbn/core/types';
import { AppDeepLink } from '@kbn/core/public';
import { mockGlobalState } from '../mock';

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

describe('security app link helpers', () => {
  describe('getInitialDeepLinks', () => {
    it('should return all deep links', () => {
      expect(getInitialDeepLinks()).toMatchSnapshot();
    });
  });
  describe('getDeepLinks', () => {
    it('basicLicense should return only basic links', () => {
      const links = getDeepLinks(mockExperimentalDefaults, basicLicense, mockCapabilities);
      expect(findDeepLink(SecurityPageName.hostsAnomalies, links)).toBeFalsy();
    });
    it('platinumLicense should return all links', () => {
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, mockCapabilities);
      expect(findDeepLink(SecurityPageName.hostsAnomalies, links)).toBeTruthy();
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
        { ...mockExperimentalDefaults, riskyHostsEnabled: false },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeFalsy();
    });
    it('experimentalKey shows entry when key = true', () => {
      const links = getDeepLinks(
        { ...mockExperimentalDefaults, riskyHostsEnabled: true },
        platinumLicense,
        mockCapabilities
      );
      expect(findDeepLink(SecurityPageName.usersRisk, links)).toBeTruthy();
    });
    const siemPages = [
      SecurityPageName.administration,
      SecurityPageName.blocklist,
      SecurityPageName.endpoints,
      SecurityPageName.eventFilters,
      SecurityPageName.hostIsolationExceptions,
      SecurityPageName.hosts,
      SecurityPageName.landing,
      SecurityPageName.network,
      SecurityPageName.overview,
      SecurityPageName.policies,
      SecurityPageName.timelines,
      SecurityPageName.trustedApps,
      SecurityPageName.users,
      SecurityPageName.uncommonProcesses,
      SecurityPageName.hostsAnomalies,
      SecurityPageName.hostsEvents,
      SecurityPageName.hostsExternalAlerts,
      SecurityPageName.sessions,
      SecurityPageName.networkDns,
      SecurityPageName.networkHttp,
      SecurityPageName.networkTls,
      SecurityPageName.networkExternalAlerts,
      SecurityPageName.networkAnomalies,
    ];
    const casesPages = [
      SecurityPageName.case,
      SecurityPageName.caseConfigure,
      SecurityPageName.caseCreate,
    ];
    it('Removes siem features when siem capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [SERVER_APP_ID]: { show: false },
      } as unknown as Capabilities;
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, capabilities);
      siemPages.forEach((page) => expect(findDeepLink(page, links)).toBeFalsy());
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
    });
    it('Removes cases features when cases capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
      } as unknown as Capabilities;
      const links = getDeepLinks(mockExperimentalDefaults, platinumLicense, capabilities);
      siemPages.forEach((page) => expect(findDeepLink(page, links)).toBeTruthy());
      casesPages.forEach((page) => expect(findDeepLink(page, links)).toBeFalsy());
    });
  });
});
