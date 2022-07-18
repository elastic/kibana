/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { SecurityPageName } from '../app/types';
import { licenseService } from '../common/hooks/use_license';
import type { StartPlugins } from '../types';
import { links, getManagementFilteredLinks } from './links';

jest.mock('../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

describe('links', () => {
  let coreMockStarted: ReturnType<typeof coreMock.createStart>;
  let getPlugins: (roles: string[]) => StartPlugins;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

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
      } as unknown as StartPlugins);
  });

  it('it returns all links without filtering when having isolate permissions', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    fakeHttpServices.get.mockResolvedValue({ total: 0 });
    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual(links);
  });

  it('it returns all links without filtering when not having isolation permissions but has at least one host isolation exceptions entry', async () => {
    fakeHttpServices.get.mockResolvedValue({ total: 1 });
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    expect(filteredLinks).toEqual(links);
  });

  it('it returns filtered links when not having isolation permissions and no host isolation exceptions entry', async () => {
    fakeHttpServices.get.mockResolvedValue({ total: 0 });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));
    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter((link) => link.id !== SecurityPageName.hostIsolationExceptions),
    });
  });
});
