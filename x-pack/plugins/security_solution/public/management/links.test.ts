/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

import { SecurityPageName } from '../app/types';

import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { StartPlugins } from '../types';
import { getManagementFilteredLinks, links } from './links';
import { allowedExperimentalValues } from '../../common/experimental_features';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';
import { getEndpointAuthzInitialStateMock } from '../../common/endpoint/service/authz/mocks';
import { licenseService as _licenseService } from '../common/hooks/use_license';
import type { LicenseService } from '../../common/license';
import { createLicenseServiceMock } from '../../common/license/mocks';
import type { FleetAuthz } from '@kbn/fleet-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common/mocks';
import type { DeepPartial } from '@kbn/utility-types';
import { merge } from 'lodash';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

jest.mock('../common/hooks/use_license');

jest.mock('../../common/endpoint/service/authz', () => {
  const originalModule = jest.requireActual('../../common/endpoint/service/authz');
  return {
    ...originalModule,
    calculateEndpointAuthz: jest.fn(),
  };
});

jest.mock('../common/lib/kibana');

const licenseServiceMock = _licenseService as jest.Mocked<LicenseService>;

describe('links', () => {
  let coreMockStarted: ReturnType<typeof coreMock.createStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

  const getLinksWithout = (...excludedLinks: SecurityPageName[]) => ({
    ...links,
    links: links.links?.filter((link) => !excludedLinks.includes(link.id)),
  });

  const getPlugins = (
    roles: string[],
    fleetAuthzOverrides: DeepPartial<FleetAuthz> = {}
  ): StartPlugins => {
    return {
      security: {
        authc: {
          getCurrentUser: jest.fn().mockReturnValue({ roles }),
        },
      },
      fleet: {
        authz: merge(createFleetAuthzMock(), fleetAuthzOverrides),
      },
    } as unknown as StartPlugins;
  };

  beforeAll(() => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: { ...allowedExperimentalValues },
    });
  });

  beforeEach(() => {
    coreMockStarted = coreMock.createStart();
    fakeHttpServices = coreMockStarted.http as jest.Mocked<HttpSetup>;
  });

  afterEach(() => {
    fakeHttpServices.get.mockClear();
    Object.assign(licenseServiceMock, createLicenseServiceMock());
  });

  it('should return all links for user with all sub-feature privileges', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));
    expect(filteredLinks).toEqual(links);
  });

  describe('Action Logs', () => {
    it('should return all but response actions link when no actions log access', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadActionsLogManagement: false,
        })
      );
      fakeHttpServices.get.mockResolvedValue({ total: 0 });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.responseActionsHistory));
    });
  });

  describe('Host Isolation Exception', () => {
    it('should NOT return HIE if `canReadHostIsolationExceptions` is false', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({ canReadHostIsolationExceptions: false })
      );

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should NOT return HIE if license is lower than Enterprise and NO HIE entries exist', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({ canReadHostIsolationExceptions: false })
      );

      fakeHttpServices.get.mockResolvedValue({ total: 0 });
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: true },
      });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins([], {
          packagePrivileges: {
            endpoint: {
              actions: {
                readHostIsolationExceptions: {
                  executePackageAction: true,
                },
              },
            },
          },
        })
      );

      expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        query: expect.objectContaining({
          list_id: [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id],
        }),
      });
      expect(calculateEndpointAuthz as jest.Mock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should return HIE if license is lower than Enterprise, but HIE entries exist', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({ canReadHostIsolationExceptions: true })
      );

      fakeHttpServices.get.mockResolvedValue({ total: 100 });
      licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: true },
      });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins([], {
          packagePrivileges: {
            endpoint: {
              actions: {
                readHostIsolationExceptions: {
                  executePackageAction: true,
                },
              },
            },
          },
        })
      );

      expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
        query: expect.objectContaining({
          list_id: [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id],
        }),
      });
      expect(calculateEndpointAuthz as jest.Mock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true
      );
      expect(filteredLinks).toEqual(getLinksWithout());
    });
  });

  // this can be removed after removing endpointRbacEnabled feature flag
  describe('without endpointRbacEnabled', () => {
    beforeAll(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: false },
      });
    });

    it('shows Trusted Applications for non-superuser, too', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(links);
    });
  });

  // this can be the default after removing endpointRbacEnabled feature flag
  describe('with endpointRbacEnabled', () => {
    beforeAll(() => {
      ExperimentalFeaturesService.init({
        experimentalFeatures: { ...allowedExperimentalValues, endpointRbacEnabled: true },
      });
    });

    it('should return all links for user with all sub-feature privileges', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(links);
    });

    it('should hide Trusted Applications for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadTrustedApplications: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.trustedApps));
    });

    it('should hide Event Filters for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEventFilters: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.eventFilters));
    });

    it('should hide Blocklist for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadBlocklist: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.blocklist));
    });

    it('should NOT return policies if `canReadPolicyManagement` is `false`', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadPolicyManagement: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.policies));
    });
  });

  describe('Endpoint List', () => {
    it('should return all but endpoints link when no Endpoint List READ access', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadEndpointList: false,
        })
      );
      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.endpoints));
    });
  });
});
