/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_FEATURE_ID, SecurityPageName, SERVER_APP_ID } from '../../../common/constants';
import type { Capabilities } from '@kbn/core/types';
import { mockGlobalState, TestProviders } from '../mock';
import type { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import type { AppLinkItems, LinkItem, LinksPermissions } from './types';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useAppLinks,
  getAncestorLinksInfo,
  getLinkInfo,
  needsUrlState,
  updateAppLinks,
  useLinkExists,
  isLinkUiSettingsAllowed,
} from './links';
import { createCapabilities } from './test_utils';
import { hasCapabilities } from '../lib/capabilities';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import React from 'react';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

const defaultAppLinks: AppLinkItems = [
  {
    id: SecurityPageName.hosts,
    title: 'Hosts',
    path: '/hosts',
    links: [
      {
        id: SecurityPageName.hostsAnomalies,
        title: 'Anomalies',
        path: `/hosts/anomalies`,
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

const mockUpselling = new UpsellingService();

const mockExperimentalDefaults = mockGlobalState.app.enableExperimental;

const mockCapabilities = {
  [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
  [SERVER_APP_ID]: { show: true },
} as unknown as Capabilities;

const fakePageId = 'fakePage';
const testFeatureflag = 'detectionResponseEnabled';

jest.mock('../../app_links', () => {
  const actual = jest.requireActual('../../app_links');
  const fakeLink = {
    id: fakePageId,
    title: 'test fake menu item',
    path: 'test fake path',
    hideWhenExperimentalKey: testFeatureflag,
  };

  return {
    ...actual,
    getAppLinks: () => [...actual.appLinks, fakeLink],
    appLinks: [...actual.appLinks, fakeLink],
  };
});

const licenseBasicMock = jest.fn().mockImplementation((arg: LicenseType) => arg === 'basic');
const licensePremiumMock = jest.fn().mockReturnValue(true);
const mockLicense = {
  hasAtLeast: licensePremiumMock,
} as unknown as ILicense;

const mockUiSettingsClient = uiSettingsServiceMock.createStartContract();

const renderUseAppLinks = () =>
  renderHook<{}, AppLinkItems>(() => useAppLinks(), { wrapper: TestProviders });
const renderUseLinkExists = (id: SecurityPageName) =>
  renderHook<React.PropsWithChildren<SecurityPageName>, boolean>(() => useLinkExists(id), {
    wrapper: TestProviders,
  });

describe('Security links', () => {
  beforeEach(() => {
    mockLicense.hasAtLeast = licensePremiumMock;

    updateAppLinks(defaultAppLinks, {
      capabilities: mockCapabilities,
      experimentalFeatures: mockExperimentalDefaults,
      license: mockLicense,
      upselling: mockUpselling,
      uiSettingsClient: mockUiSettingsClient,
    });
  });

  describe('useAppLinks', () => {
    it('should return initial appLinks', () => {
      const { result } = renderUseAppLinks();
      expect(result.current).toStrictEqual(defaultAppLinks);
    });

    it('should filter not allowed links', async () => {
      const { result } = renderUseAppLinks();
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
            upselling: mockUpselling,
            uiSettingsClient: mockUiSettingsClient,
          }
        );
      });

      await waitFor(() => null);

      expect(result.current).toStrictEqual([networkLinkItem]);
    });

    it('should return unauthorized page when page has upselling (serverless)', async () => {
      const upselling = new UpsellingService();
      upselling.setPages({ [SecurityPageName.network]: () => <span /> });

      const { result } = renderUseAppLinks();
      const networkLinkItem = {
        id: SecurityPageName.network,
        title: 'Network',
        path: '/network',
        capabilities: [`${CASES_FEATURE_ID}.read_cases`, `${CASES_FEATURE_ID}.write_cases`],
        licenseType: 'basic' as const,
      };

      await act(async () => {
        updateAppLinks(
          [
            {
              ...networkLinkItem,
              // The following links should be filtered out because network link is unauthorized
              links: [
                {
                  id: SecurityPageName.networkDns,
                  title: 'dns',
                  path: '/dns',
                },
                {
                  id: SecurityPageName.networkHttp,
                  title: 'Http',
                  path: '/http',
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
            upselling,
            uiSettingsClient: mockUiSettingsClient,
          }
        );
      });

      await waitFor(() => null);

      expect(result.current).toStrictEqual([{ ...networkLinkItem, unauthorized: true }]);
    });

    it('should return unauthorized page when page has upselling (ESS)', async () => {
      const upselling = new UpsellingService();
      upselling.setPages({ [SecurityPageName.network]: () => <span /> });
      const { result } = renderUseAppLinks();
      const hostLinkItem = {
        id: SecurityPageName.hosts,
        title: 'Hosts',
        path: '/hosts',
        licenseType: 'platinum' as const,
      };

      mockUpselling.setPages({
        [SecurityPageName.hosts]: () => <span />,
      });

      await act(async () => {
        updateAppLinks([hostLinkItem], {
          capabilities: mockCapabilities,
          experimentalFeatures: mockExperimentalDefaults,
          license: { hasAtLeast: licenseBasicMock } as unknown as ILicense,
          upselling: mockUpselling,
          uiSettingsClient: mockUiSettingsClient,
        });
      });

      await waitFor(() => null);

      expect(result.current).toStrictEqual([{ ...hostLinkItem, unauthorized: true }]);

      // cleanup
      mockUpselling.setPages({});
    });

    it('should filter out experimental page even if it has upselling', async () => {
      const upselling = new UpsellingService();
      upselling.setPages({ [SecurityPageName.network]: () => <span /> });
      const { result } = renderUseAppLinks();
      const hostLinkItem = {
        id: SecurityPageName.hosts,
        title: 'Hosts',
        path: '/hosts',
        licenseType: 'platinum' as const,
        experimentalKey: 'flagEnabled' as unknown as keyof typeof mockExperimentalDefaults,
      };

      mockUpselling.setPages({
        [SecurityPageName.hosts]: () => <span />,
      });

      await act(async () => {
        updateAppLinks([hostLinkItem], {
          capabilities: mockCapabilities,
          experimentalFeatures: mockExperimentalDefaults,
          license: { hasAtLeast: licenseBasicMock } as unknown as ILicense,
          upselling: mockUpselling,
          uiSettingsClient: mockUiSettingsClient,
        });
      });

      await waitFor(() => null);
      expect(result.current).toStrictEqual([]);

      // cleanup
      mockUpselling.setPages({});
    });
  });

  describe('useLinkExists', () => {
    it('should return true if the link exists', () => {
      const { result } = renderUseLinkExists(SecurityPageName.hostsEvents);
      expect(result.current).toBe(true);
    });

    it('should return false if the link does not exists', () => {
      const { result } = renderUseLinkExists(SecurityPageName.rules);
      expect(result.current).toBe(false);
    });

    it('should update if the links are removed', async () => {
      const { result } = renderUseLinkExists(SecurityPageName.hostsEvents);
      expect(result.current).toBe(true);
      await act(async () => {
        updateAppLinks(
          [
            {
              id: SecurityPageName.hosts,
              title: 'Hosts',
              path: '/hosts',
            },
          ],
          {
            capabilities: mockCapabilities,
            experimentalFeatures: mockExperimentalDefaults,
            license: mockLicense,
            upselling: new UpsellingService(),
            uiSettingsClient: mockUiSettingsClient,
          }
        );
      });

      await waitFor(() => null);
      expect(result.current).toBe(false);
    });

    it('should update if the links are added', async () => {
      const { result } = renderUseLinkExists(SecurityPageName.rules);
      expect(result.current).toBe(false);
      await act(async () => {
        updateAppLinks(
          [
            {
              id: SecurityPageName.hosts,
              title: 'Hosts',
              path: '/hosts',
              links: [
                {
                  id: SecurityPageName.rules,
                  title: 'Rules',
                  path: '/rules',
                },
              ],
            },
          ],
          {
            capabilities: mockCapabilities,
            experimentalFeatures: mockExperimentalDefaults,
            license: mockLicense,
            upselling: mockUpselling,
            uiSettingsClient: mockUiSettingsClient,
          }
        );
      });

      await waitFor(() => null);
      expect(result.current).toBe(true);
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

  describe('hasCapabilities', () => {
    const siemShow = 'siem.show';
    const createCases = 'securitySolutionCases.create_cases';
    const readCases = 'securitySolutionCases.read_cases';
    const pushCases = 'securitySolutionCases.push_cases';

    it('returns false when capabilities is an empty array', () => {
      expect(hasCapabilities(createCapabilities(), [])).toBeFalsy();
    });

    it('returns true when the capability requested is specified as a single value', () => {
      expect(hasCapabilities(createCapabilities({ siem: { show: true } }), siemShow)).toBeTruthy();
    });

    it('returns true when the capability requested is a single entry in an array', () => {
      expect(
        hasCapabilities(createCapabilities({ siem: { show: true } }), [siemShow])
      ).toBeTruthy();
    });

    it("returns true when the capability requested is a single entry in an AND'd array format", () => {
      expect(
        hasCapabilities(createCapabilities({ siem: { show: true } }), [[siemShow]])
      ).toBeTruthy();
    });

    it('returns true when only one requested capability is found in an OR situation', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { create_cases: false },
          }),
          [siemShow, createCases]
        )
      ).toBeTruthy();
    });

    it('returns true when only the create_cases requested capability is found in an OR situation', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: false },
            securitySolutionCases: { create_cases: true },
          }),
          [siemShow, createCases]
        )
      ).toBeTruthy();
    });

    it('returns false when none of the requested capabilities are found in an OR situation', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { create_cases: false },
          }),
          [readCases, createCases]
        )
      ).toBeFalsy();
    });

    it('returns true when all of the requested capabilities are found in an AND situation', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: true, create_cases: true },
          }),
          [[readCases, createCases]]
        )
      ).toBeTruthy();
    });

    it('returns false when neither the single OR capability is found nor all of the AND capabilities', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: false },
            securitySolutionCases: { read_cases: false, create_cases: true },
          }),
          [siemShow, [readCases, createCases]]
        )
      ).toBeFalsy();
    });

    it('returns true when the single OR capability is found when using an OR with an AND format', () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: false, create_cases: true },
          }),
          [siemShow, [readCases, createCases]]
        )
      ).toBeTruthy();
    });

    it("returns false when the AND'd expressions are not satisfied", () => {
      expect(
        hasCapabilities(
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: false, create_cases: true, push_cases: false },
          }),
          [
            [siemShow, pushCases],
            [readCases, createCases],
          ]
        )
      ).toBeFalsy();
    });
  });

  describe('isLinkUiSettingsAllowed', () => {
    const SETTING_KEY = 'test setting';
    const mockedLink: LinkItem = {
      id: SecurityPageName.entityAnalyticsAssetClassification,
      title: 'test title',
      path: '/test_path',
    };

    const mockedPermissions = {
      uiSettingsClient: mockUiSettingsClient,
    } as unknown as LinksPermissions;

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when uiSettingRequired is not set', () => {
      const link: LinkItem = {
        ...mockedLink,
        uiSettingRequired: undefined,
      };
      expect(isLinkUiSettingsAllowed(link, mockedPermissions)).toBeTruthy();
      expect(mockUiSettingsClient.get).not.toHaveBeenCalled();
    });

    it('returns true when uiSettingRequired is a string and the corresponding UI setting is true', () => {
      mockUiSettingsClient.get = jest.fn().mockReturnValue(true);
      const link: LinkItem = {
        ...mockedLink,
        uiSettingRequired: SETTING_KEY,
      };

      expect(isLinkUiSettingsAllowed(link, mockedPermissions)).toBeTruthy();
      expect(mockUiSettingsClient.get).toHaveBeenCalledWith(SETTING_KEY);
    });

    it('returns false when uiSettingRequired is a string and the corresponding UI setting is false', () => {
      mockUiSettingsClient.get = jest.fn().mockReturnValue(false);
      const link: LinkItem = {
        ...mockedLink,
        uiSettingRequired: SETTING_KEY,
      };

      expect(isLinkUiSettingsAllowed(link, mockedPermissions)).toBeFalsy();
      expect(mockUiSettingsClient.get).toHaveBeenCalledWith(SETTING_KEY);
    });

    it('returns true when uiSettingRequired is an object and the corresponding UI setting matches the value', () => {
      const link: LinkItem = {
        ...mockedLink,
        uiSettingRequired: { key: SETTING_KEY, value: 'any text' },
      };
      mockUiSettingsClient.get = jest.fn().mockReturnValue('any text');

      expect(isLinkUiSettingsAllowed(link, mockedPermissions)).toBeTruthy();
      expect(mockUiSettingsClient.get).toHaveBeenCalledWith(SETTING_KEY);
    });

    it('returns false when uiSettingRequired is an object and the corresponding UI setting does not match the value', () => {
      const link: LinkItem = {
        ...mockedLink,
        uiSettingRequired: { key: SETTING_KEY, value: 'any text' },
      };
      mockUiSettingsClient.get = jest.fn().mockReturnValue('different text');

      expect(isLinkUiSettingsAllowed(link, mockedPermissions)).toBeFalsy();
      expect(mockUiSettingsClient.get).toHaveBeenCalledWith(SETTING_KEY);
    });
  });
});
