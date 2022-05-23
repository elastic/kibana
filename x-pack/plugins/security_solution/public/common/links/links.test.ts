/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';
import { Capabilities } from '@kbn/core/types';
import { mockGlobalState, TestProviders } from '../mock';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { AppLinkItems } from './types';
import { act, renderHook } from '@testing-library/react-hooks';
import {
  useAppLinks,
  getAncestorLinksInfo,
  getLinkInfo,
  needsUrlState,
  updateAppLinks,
  excludeAppLink,
} from './links';

const defaultAppLinks: AppLinkItems = [
  {
    id: SecurityPageName.hosts,
    title: 'Hosts',
    path: '/hosts',
    links: [
      {
        id: SecurityPageName.hostsAuthentications,
        title: 'Authentications',
        path: `/hosts/authentications`,
      },
      {
        id: SecurityPageName.hostsEvents,
        title: 'Events',
        path: `/hosts/events`,
        skipUrlState: true,
      },
    ],
  },
];

const mockExperimentalDefaults = mockGlobalState.app.enableExperimental;

const mockCapabilities = {
  [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
  [SERVER_APP_ID]: { show: true },
} as unknown as Capabilities;

const licenseBasicMock = jest.fn().mockImplementation((arg: LicenseType) => arg === 'basic');
const licensePremiumMock = jest.fn().mockReturnValue(true);
const mockLicense = {
  hasAtLeast: licensePremiumMock,
} as unknown as ILicense;

const renderUseAppLinks = () =>
  renderHook<{}, AppLinkItems>(() => useAppLinks(), { wrapper: TestProviders });

describe('Security app links', () => {
  beforeEach(() => {
    mockLicense.hasAtLeast = licensePremiumMock;

    updateAppLinks(defaultAppLinks, {
      capabilities: mockCapabilities,
      experimentalFeatures: mockExperimentalDefaults,
      license: mockLicense,
    });
  });

  describe('useAppLinks', () => {
    it('should return initial appLinks', () => {
      const { result } = renderUseAppLinks();
      expect(result.current).toStrictEqual(defaultAppLinks);
    });

    it('should filter not allowed links', async () => {
      const { result, waitForNextUpdate } = renderUseAppLinks();
      // this link should not be excluded, the test checks all conditions are passed
      const networkLinkItem = {
        id: SecurityPageName.network,
        title: 'Network',
        path: '/network',
        capabilities: [`${CASES_FEATURE_ID}.read_cases`, `${SERVER_APP_ID}.show`],
        experimentalKey: 'flagEnabled' as unknown as keyof typeof mockExperimentalDefaults,
        hideWhenExperimentalKey: 'flagDisabled' as unknown as keyof typeof mockExperimentalDefaults,
        licenseType: 'basic' as const,
      };

      await act(async () => {
        updateAppLinks(
          [
            {
              ...networkLinkItem,
              // all its links should be filtered for all different criteria
              links: [
                {
                  id: SecurityPageName.networkExternalAlerts,
                  title: 'external alerts',
                  path: '/external_alerts',
                  experimentalKey:
                    'flagDisabled' as unknown as keyof typeof mockExperimentalDefaults,
                },
                {
                  id: SecurityPageName.networkDns,
                  title: 'dns',
                  path: '/dns',
                  hideWhenExperimentalKey:
                    'flagEnabled' as unknown as keyof typeof mockExperimentalDefaults,
                },
                {
                  id: SecurityPageName.networkAnomalies,
                  title: 'Anomalies',
                  path: '/anomalies',
                  capabilities: [
                    `${CASES_FEATURE_ID}.read_cases`,
                    `${CASES_FEATURE_ID}.write_cases`,
                  ],
                },
                {
                  id: SecurityPageName.networkHttp,
                  title: 'Http',
                  path: '/http',
                  licenseType: 'gold',
                },
              ],
            },
            {
              // should be excluded by license with all its links
              id: SecurityPageName.hosts,
              title: 'Hosts',
              path: '/hosts',
              licenseType: 'platinum',
              links: [
                {
                  id: SecurityPageName.hostsEvents,
                  title: 'Events',
                  path: '/events',
                },
              ],
            },
          ],
          {
            capabilities: {
              ...mockCapabilities,
              [CASES_FEATURE_ID]: { read_cases: false, crud_cases: false },
            },
            experimentalFeatures: {
              flagEnabled: true,
              flagDisabled: false,
            } as unknown as typeof mockExperimentalDefaults,
            license: { hasAtLeast: licenseBasicMock } as unknown as ILicense,
          }
        );
        await waitForNextUpdate();
      });

      expect(result.current).toStrictEqual([networkLinkItem]);
    });
  });

  describe('excludeAppLink', () => {
    it('should exclude link from app links', async () => {
      const { result, waitForNextUpdate } = renderUseAppLinks();
      await act(async () => {
        excludeAppLink(SecurityPageName.hostsEvents);
        await waitForNextUpdate();
      });
      expect(result.current).toStrictEqual([
        {
          id: SecurityPageName.hosts,
          title: 'Hosts',
          path: '/hosts',
          links: [
            {
              id: SecurityPageName.hostsAuthentications,
              title: 'Authentications',
              path: `/hosts/authentications`,
            },
          ],
        },
      ]);
    });
  });

  describe('getAncestorLinksInfo', () => {
    it('should find ancestors flattened links', () => {
      const hierarchy = getAncestorLinksInfo(SecurityPageName.hostsEvents);
      expect(hierarchy).toStrictEqual([
        {
          id: SecurityPageName.hosts,
          path: '/hosts',
          title: 'Hosts',
        },
        {
          id: SecurityPageName.hostsEvents,
          path: '/hosts/events',
          skipUrlState: true,
          title: 'Events',
        },
      ]);
    });
  });

  describe('needsUrlState', () => {
    it('should return true when url state exists for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hosts);
      expect(needsUrl).toEqual(true);
    });
    it('should return false when url state does not exist for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hostsEvents);
      expect(needsUrl).toEqual(false);
    });
  });

  describe('getLinkInfo', () => {
    it('should get information for an individual link', () => {
      const linkInfo = getLinkInfo(SecurityPageName.hostsEvents);
      expect(linkInfo).toStrictEqual({
        id: SecurityPageName.hostsEvents,
        path: '/hosts/events',
        skipUrlState: true,
        title: 'Events',
      });
    });
  });
});
