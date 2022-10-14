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

jest.mock('../../common/endpoint/service/authz', () => {
  const originalModule = jest.requireActual('../../common/endpoint/service/authz');
  return {
    ...originalModule,
    calculateEndpointAuthz: jest.fn(),
  };
});

describe('links', () => {
  let coreMockStarted: ReturnType<typeof coreMock.createStart>;
  let getPlugins: (roles: string[]) => StartPlugins;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

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

  it('should return all links without filtering when having isolate permissions', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: true,
      canIsolateHost: true,
      canReadActionsLogManagement: true,
    });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual(links);
  });

  it('should return all but HIE and response actions history links when neither management access', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: false,
      canIsolateHost: true,
      canReadActionsLogManagement: true,
    });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter(
        (link) =>
          link.id !== SecurityPageName.hostIsolationExceptions &&
          link.id !== SecurityPageName.responseActionsHistory
      ),
    });
  });

  it('should return all but response actions link when no actions log access', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: true,
      canIsolateHost: true,
      canReadActionsLogManagement: false,
    });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter((link) => link.id !== SecurityPageName.responseActionsHistory),
    });
  });

  it('should return all but response action link when not having isolation permissions but has at least one host isolation exceptions entry', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: true,
      canIsolateHost: false,
      canReadActionsLogManagement: true,
    });
    fakeHttpServices.get.mockResolvedValue({ total: 1 });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter((link) => link.id !== SecurityPageName.responseActionsHistory),
    });
  });

  it('should return all but response actions history when no access privilege to either response actions history or HIE but has one HIE entry', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: true,
      canIsolateHost: false,
      canReadActionsLogManagement: false,
    });
    fakeHttpServices.get.mockResolvedValue({ total: 1 });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter((link) => link.id !== SecurityPageName.responseActionsHistory),
    });
  });

  it('should return all but HIE and response actions history links when not having isolation permissions and no host isolation exceptions entry', async () => {
    (calculateEndpointAuthz as jest.Mock).mockReturnValue({
      canAccessEndpointManagement: false,
      canIsolateHost: false,
      canReadActionsLogManagement: false,
    });
    fakeHttpServices.get.mockResolvedValue({ total: 0 });

    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter(
        (link) =>
          link.id !== SecurityPageName.hostIsolationExceptions &&
          link.id !== SecurityPageName.responseActionsHistory
      ),
    });
  });
});
