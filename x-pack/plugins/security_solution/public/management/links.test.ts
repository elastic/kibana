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
import { links, getManagementFilteredLinks } from './links';
import { allowedExperimentalValues } from '../../common/experimental_features';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';
import { getEndpointAuthzInitialStateMock } from '../../common/endpoint/service/authz/mocks';

jest.mock('../../common/endpoint/service/authz', () => {
  const originalModule = jest.requireActual('../../common/endpoint/service/authz');
  return {
    ...originalModule,
    calculateEndpointAuthz: jest.fn(),
  };
});

jest.mock('../common/lib/kibana');

describe('links', () => {
  let coreMockStarted: ReturnType<typeof coreMock.createStart>;
  let getPlugins: (roles: string[]) => StartPlugins;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

  const getLinksWithout = (...excludedLinks: SecurityPageName[]) => ({
    ...links,
    links: links.links?.filter((link) => !excludedLinks.includes(link.id)),
  });

  beforeAll(() => {
    ExperimentalFeaturesService.init({
      experimentalFeatures: { ...allowedExperimentalValues },
    });
  });

  beforeEach(() => {
    coreMockStarted = coreMock.createStart();
    fakeHttpServices = coreMockStarted.http as jest.Mocked<HttpSetup>;
    fakeHttpServices.get.mockClear();
    getPlugins = (roles) =>
      ({
        security: {
          authc: {
            getCurrentUser: jest.fn().mockReturnValue({ roles }),
          },
        },
        fleet: {
          authz: {
            fleet: {
              all: true,
            },
          },
        },
      } as unknown as StartPlugins);
  });

  it('should return all links without filtering when having isolate permission', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
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
      expect(filteredLinks).toEqual({
        ...links,
        links: links.links?.filter((link) => link.id !== SecurityPageName.responseActionsHistory),
      });
    });
  });

  describe('Host Isolation Exception', () => {
    it('should return all but HIE when NO isolation permission due to privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadHostIsolationExceptions: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should return all but HIE when NO isolation permission due to license and NO host isolation exceptions entry', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canIsolateHost: false,
        })
      );
      fakeHttpServices.get.mockResolvedValue({ total: 0 });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should return all but HIE when HAS isolation permission AND has HIE entry but not superuser', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canIsolateHost: false,
          canAccessEndpointManagement: false,
        })
      );
      fakeHttpServices.get.mockResolvedValue({ total: 1 });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should return all when NO isolation permission due to license but HAS at least one host isolation exceptions entry', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canIsolateHost: false,
        })
      );
      fakeHttpServices.get.mockResolvedValue({ total: 1 });

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(links);
    });

    it('should not affect showing Action Log if getting from HIE API throws error', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canIsolateHost: false,
        })
      );
      fakeHttpServices.get.mockRejectedValue(new Error());

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.hostIsolationExceptions));
    });

    it('should not affect hiding Action Log if getting from HIE API throws error', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canIsolateHost: false,
          canReadActionsLogManagement: false,
        })
      );
      fakeHttpServices.get.mockRejectedValue(new Error());

      const filteredLinks = await getManagementFilteredLinks(
        coreMockStarted,
        getPlugins(['superuser'])
      );
      expect(filteredLinks).toEqual(
        getLinksWithout(
          SecurityPageName.hostIsolationExceptions,
          SecurityPageName.responseActionsHistory
        )
      );
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

    it('hides Trusted Applications for user without privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(
        getEndpointAuthzInitialStateMock({
          canReadTrustedApplications: false,
        })
      );

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(getLinksWithout(SecurityPageName.trustedApps));
    });

    it('shows Trusted Applications for user with privilege', async () => {
      (calculateEndpointAuthz as jest.Mock).mockReturnValue(getEndpointAuthzInitialStateMock());

      const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));

      expect(filteredLinks).toEqual(links);
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
      expect(filteredLinks).toEqual({
        ...links,
        links: links.links?.filter((link) => link.id !== SecurityPageName.endpoints),
      });
    });
  });
});
