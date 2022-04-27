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
const allDeepLinks = [
  {
    deepLinks: [
      {
        id: 'alerts',
        keywords: ['Alerts'],
        navLinkStatus: 1,
        order: 9001,
        path: '/alerts',
        searchable: true,
        title: 'Alerts',
      },
      {
        id: 'rules',
        keywords: ['Rules'],
        navLinkStatus: 3,
        path: '/rules',
        searchable: true,
        title: 'Rules',
      },
      {
        id: 'exceptions',
        keywords: ['Exception lists'],
        navLinkStatus: 3,
        path: '/exceptions',
        searchable: true,
        title: 'Exception lists',
      },
    ],
    id: 'detections',
    keywords: ['Detect'],
    navLinkStatus: 3,
    path: '/alerts',
    title: 'Detect',
  },
  {
    deepLinks: [
      {
        deepLinks: [
          {
            id: 'hosts-authentications',
            path: '/hosts/authentications',
            title: 'Authentications',
          },
          {
            id: 'uncommon_processes',
            path: '/hosts/uncommonProcesses',
            title: 'Uncommon Processes',
          },
          {
            id: 'hosts-anomalies',
            path: '/hosts/anomalies',
            title: 'Anomalies',
          },
          {
            id: 'hosts-events',
            path: '/hosts/events',
            title: 'Events',
          },
          {
            id: 'hosts-external_alerts',
            path: '/hosts/externalAlerts',
            title: 'External Alerts',
          },
          {
            id: 'users-risk',
            path: '/hosts/hostRisk',
            title: 'Hosts by risk',
          },
          {
            id: 'sessions',
            path: '/hosts/sessions',
            title: 'Sessions',
          },
        ],
        id: 'hosts',
        keywords: ['Hosts'],
        navLinkStatus: 1,
        order: 9002,
        path: '/hosts',
        searchable: true,
        title: 'Hosts',
      },
    ],
    id: 'explore',
    keywords: ['Threat hunting'],
    navLinkStatus: 3,
    path: 'to do',
    title: 'Explore',
  },
];

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
      expect(getInitialDeepLinks()).toEqual(allDeepLinks);
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
    it('Removes features when siem capabilities are false', () => {
      const capabilities = {
        ...mockCapabilities,
        [SERVER_APP_ID]: { show: false },
      } as unknown as Capabilities;
      expect(
        getDeepLinks(
          { ...mockExperimentalDefaults, riskyHostsEnabled: true },
          platinumLicense,
          capabilities
        )
      ).toEqual([]);
    });
  });
});
