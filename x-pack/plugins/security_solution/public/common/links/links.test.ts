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
import type { AppLinkItems } from './types';
import { act, renderHook } from '@testing-library/react-hooks';
import {
  useAppLinks,
  getAncestorLinksInfo,
  getLinkInfo,
  needsUrlState,
  updateAppLinks,
  useLinkExists,
  hasCapabilities,
} from './links';
import { createCapabilities } from './test_utils';

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

const mockExperimentalDefaults = mockGlobalState.app.enableExperimental;

const mockCapabilities = {
  [CASES_FEATURE_ID]: { read_cases: true, crud_cases: true },
  [SERVER_APP_ID]: { show: true },
} as unknown as Capabilities;

const fakePageId = 'fakePage';
const testFeatureflag = 'detectionResponseEnabled';

jest.mock('./app_links', () => {
  const actual = jest.requireActual('./app_links');
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

const renderUseAppLinks = () =>
  renderHook<{}, AppLinkItems>(() => useAppLinks(), { wrapper: TestProviders });
const renderUseLinkExists = (id: SecurityPageName) =>
  renderHook<SecurityPageName, boolean>(() => useLinkExists(id), {
    wrapper: TestProviders,
  });

describe('Security links', () => {
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
      const { result, waitForNextUpdate } = renderUseLinkExists(SecurityPageName.hostsEvents);
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
          }
        );
        await waitForNextUpdate();
      });
      expect(result.current).toBe(false);
    });

    it('should update if the links are added', async () => {
      const { result, waitForNextUpdate } = renderUseLinkExists(SecurityPageName.rules);
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
          }
        );
        await waitForNextUpdate();
      });
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
      expect(hasCapabilities([], createCapabilities())).toBeFalsy();
    });

    it('returns true when the capability requested is specified as a single value', () => {
      expect(hasCapabilities(siemShow, createCapabilities({ siem: { show: true } }))).toBeTruthy();
    });

    it('returns true when the capability requested is a single entry in an array', () => {
      expect(
        hasCapabilities([siemShow], createCapabilities({ siem: { show: true } }))
      ).toBeTruthy();
    });

    it("returns true when the capability requested is a single entry in an AND'd array format", () => {
      expect(
        hasCapabilities([[siemShow]], createCapabilities({ siem: { show: true } }))
      ).toBeTruthy();
    });

    it('returns true when only one requested capability is found in an OR situation', () => {
      expect(
        hasCapabilities(
          [siemShow, createCases],
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { create_cases: false },
          })
        )
      ).toBeTruthy();
    });

    it('returns true when only the create_cases requested capability is found in an OR situation', () => {
      expect(
        hasCapabilities(
          [siemShow, createCases],
          createCapabilities({
            siem: { show: false },
            securitySolutionCases: { create_cases: true },
          })
        )
      ).toBeTruthy();
    });

    it('returns false when none of the requested capabilities are found in an OR situation', () => {
      expect(
        hasCapabilities(
          [readCases, createCases],
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { create_cases: false },
          })
        )
      ).toBeFalsy();
    });

    it('returns true when all of the requested capabilities are found in an AND situation', () => {
      expect(
        hasCapabilities(
          [[readCases, createCases]],
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: true, create_cases: true },
          })
        )
      ).toBeTruthy();
    });

    it('returns false when neither the single OR capability is found nor all of the AND capabilities', () => {
      expect(
        hasCapabilities(
          [siemShow, [readCases, createCases]],
          createCapabilities({
            siem: { show: false },
            securitySolutionCases: { read_cases: false, create_cases: true },
          })
        )
      ).toBeFalsy();
    });

    it('returns true when the single OR capability is found when using an OR with an AND format', () => {
      expect(
        hasCapabilities(
          [siemShow, [readCases, createCases]],
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: false, create_cases: true },
          })
        )
      ).toBeTruthy();
    });

    it("returns false when the AND'd expressions are not satisfied", () => {
      expect(
        hasCapabilities(
          [
            [siemShow, pushCases],
            [readCases, createCases],
          ],
          createCapabilities({
            siem: { show: true },
            securitySolutionCases: { read_cases: false, create_cases: true, push_cases: false },
          })
        )
      ).toBeFalsy();
    });
  });
});
