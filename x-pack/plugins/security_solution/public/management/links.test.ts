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
    isEnterprise: jest.fn(() => true),
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

  it('it returns all links without filtering when having isolate permission', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(true);
    fakeHttpServices.get.mockResolvedValue({ total: 0 });
    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );
    expect(filteredLinks).toEqual(links);
  });

  it('it returns all but response actions history link when NO isolation permission but HAS at least one host isolation exceptions entry', async () => {
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
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

  it('it returns all but response actions history when NO access to either response actions history or HIE but HAS at least one HIE entry', async () => {
    fakeHttpServices.get.mockResolvedValue({ total: 1 });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    const filteredLinks = await getManagementFilteredLinks(
      coreMockStarted,
      getPlugins(['superuser'])
    );

    expect(filteredLinks).toEqual({
      ...links,
      links: links.links?.filter((link) => link.id !== SecurityPageName.responseActionsHistory),
    });
  });

  it('it returns all but response actions history when NO enterprise license and can not isolate but HAS an HIE entry', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
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

  it('it returns all but response actions history and HIE links when NO enterprise license and no HIE entry', async () => {
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);
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

  it('it returns filtered links when having NO isolation permission and NO host isolation exceptions entry', async () => {
    fakeHttpServices.get.mockResolvedValue({ total: 0 });
    (licenseService.isPlatinumPlus as jest.Mock).mockReturnValue(false);
    const filteredLinks = await getManagementFilteredLinks(coreMockStarted, getPlugins([]));
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
