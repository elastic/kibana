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
  updateAllAppLinks,
  updateAppLinks,
} from './links';

jest.mock('./app_links', () => ({
  getAllAppLinks: () => [
    {
      id: 'hosts',
      title: 'Hosts',
      path: '/hosts',
      links: [
        {
          id: 'hosts-authentications',
          title: 'Authentications',
          path: `/hosts/authentications`,
          experimentalKey: 'nonExistingKey',
        },
        {
          id: 'hosts-events',
          title: 'Events',
          path: `/hosts/events`,
          skipUrlState: true,
        },
      ],
    },
  ],
}));

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
  });

  describe('useAppLinks', () => {
    it('should return initial appLinks', () => {
      const { result } = renderUseAppLinks();
      expect(result.current).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hosts",
            "links": Array [
              Object {
                "experimentalKey": "nonExistingKey",
                "id": "hosts-authentications",
                "path": "/hosts/authentications",
                "title": "Authentications",
              },
              Object {
                "id": "hosts-events",
                "path": "/hosts/events",
                "skipUrlState": true,
                "title": "Events",
              },
            ],
            "path": "/hosts",
            "title": "Hosts",
          },
        ]
      `);
    });

    it('should update all appLinks with filtering', async () => {
      const { result, waitForNextUpdate } = renderUseAppLinks();
      await act(async () => {
        updateAllAppLinks({
          capabilities: mockCapabilities,
          experimentalFeatures: mockExperimentalDefaults,
          license: mockLicense,
        });
        await waitForNextUpdate();
      });
      expect(result.current).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hosts",
            "links": Array [
              Object {
                "id": "hosts-events",
                "path": "/hosts/events",
                "skipUrlState": true,
                "title": "Events",
              },
            ],
            "path": "/hosts",
            "title": "Hosts",
          },
        ]
      `);
    });

    it('should manually update appLinks with filtering', async () => {
      const { result, waitForNextUpdate } = renderUseAppLinks();
      await act(async () => {
        updateAppLinks(
          [
            {
              id: SecurityPageName.network,
              title: 'Network',
              path: '/network',
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
      expect(result.current).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "network",
            "path": "/network",
            "title": "Network",
          },
        ]
      `);
    });

    it('should filter not allowed links', async () => {
      const { result, waitForNextUpdate } = renderUseAppLinks();
      await act(async () => {
        updateAppLinks(
          [
            {
              // this link should not be excluded, the test checks all conditions passed
              // all its sub-links will be filtered for different reasons
              id: SecurityPageName.network,
              title: 'Network',
              path: '/network',
              capabilities: [`${CASES_FEATURE_ID}.read_cases`, `${SERVER_APP_ID}.show`],
              experimentalKey: 'flagEnabled' as unknown as keyof typeof mockExperimentalDefaults,
              hideWhenExperimentalKey:
                'flagDisabled' as unknown as keyof typeof mockExperimentalDefaults,
              licenseType: 'basic',
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
      expect(result.current).toMatchInlineSnapshot(`
        Array [
          Object {
            "capabilities": Array [
              "securitySolutionCases.read_cases",
              "siem.show",
            ],
            "experimentalKey": "flagEnabled",
            "hideWhenExperimentalKey": "flagDisabled",
            "id": "network",
            "licenseType": "basic",
            "path": "/network",
            "title": "Network",
          },
        ]
      `);
    });
  });

  describe('getAncestorLinksInfo', () => {
    it('finds ancestors flattened links', () => {
      const hierarchy = getAncestorLinksInfo(SecurityPageName.hostsEvents);
      expect(hierarchy).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "hosts",
            "path": "/hosts",
            "title": "Hosts",
          },
          Object {
            "id": "hosts-events",
            "path": "/hosts/events",
            "skipUrlState": true,
            "title": "Events",
          },
        ]
      `);
    });
  });

  describe('needsUrlState', () => {
    it('returns true when url state exists for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hosts);
      expect(needsUrl).toEqual(true);
    });
    it('returns false when url state does not exist for page', () => {
      const needsUrl = needsUrlState(SecurityPageName.hostsEvents);
      expect(needsUrl).toEqual(false);
    });
  });

  describe('getLinkInfo', () => {
    it('gets information for an individual link', () => {
      const linkInfo = getLinkInfo(SecurityPageName.hostsEvents);
      expect(linkInfo).toMatchInlineSnapshot(`
        Object {
          "id": "hosts-events",
          "path": "/hosts/events",
          "skipUrlState": true,
          "title": "Events",
        }
      `);
    });
  });
});
