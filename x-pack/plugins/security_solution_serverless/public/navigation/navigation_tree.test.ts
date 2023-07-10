/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeNavLink } from '@kbn/core/public';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import { subscribeNavigationTree } from './navigation_tree';
import { BehaviorSubject } from 'rxjs';
import { mockServices, mockProjectNavLinks } from '../common/__mocks__/services.mock';
import type { ProjectNavigationLink } from './links';

const mockChromeNavLinks = jest.fn((): ChromeNavLink[] => []);
const mockChromeGetNavLinks = jest.fn(() => new BehaviorSubject(mockChromeNavLinks()));
const mockChromeNavLinksGet = jest.fn((id: string): ChromeNavLink | undefined =>
  mockChromeNavLinks().find((link) => link.id === id)
);
const mockChromeNavLinksHas = jest.fn((id: string): boolean =>
  mockChromeNavLinks().some((link) => link.id === id)
);

const testServices = {
  ...mockServices,
  chrome: {
    ...mockServices.chrome,
    navLinks: {
      ...mockServices.chrome.navLinks,
      get: mockChromeNavLinksGet,
      has: mockChromeNavLinksHas,
      getNavLinks$: mockChromeGetNavLinks,
    },
  },
};

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;

const link1: ProjectNavigationLink = { id: link1Id, title: 'link 1' };
const link2: ProjectNavigationLink = { id: link2Id, title: 'link 2' };

const chromeNavLink1: ChromeNavLink = {
  id: `${APP_UI_ID}:${link1.id}`,
  title: link1.title,
  href: '/link1',
  url: '/link1',
  baseUrl: '',
};
const chromeNavLink2: ChromeNavLink = {
  id: `${APP_UI_ID}:${link2.id}`,
  title: link2.title,
  href: '/link2',
  url: '/link2',
  baseUrl: '',
};

const waitForDebounce = async () => new Promise((resolve) => setTimeout(resolve, 150));

describe('subscribeNavigationTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeNavLinks.mockReturnValue([chromeNavLink1, chromeNavLink2]);
  });

  it('should call serverless setNavigation', async () => {
    mockProjectNavLinks.mockReturnValueOnce([link1]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLink1.id,
              title: link1.title,
              path: ['root', chromeNavLink1.id],
              deepLink: chromeNavLink1,
            },
          ],
        },
      ],
    });
  });

  it('should call serverless setNavigation with external link', async () => {
    const externalLink = { ...link1, appId: 'externalAppId' };
    const chromeNavLinkExpected = {
      ...chromeNavLink1,
      id: `${externalLink.appId}:${externalLink.id}`,
    };
    mockChromeNavLinks.mockReturnValue([chromeNavLinkExpected]);
    mockProjectNavLinks.mockReturnValueOnce([externalLink]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLinkExpected.id,
              title: externalLink.title,
              path: ['root', chromeNavLinkExpected.id],
              deepLink: chromeNavLinkExpected,
            },
          ],
        },
      ],
    });
  });

  it('should call serverless setNavigation with nested children', async () => {
    mockProjectNavLinks.mockReturnValueOnce([{ ...link1, links: [link2] }]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLink1.id,
              title: link1.title,
              path: ['root', chromeNavLink1.id],
              deepLink: chromeNavLink1,
              children: [
                {
                  id: chromeNavLink2.id,
                  title: link2.title,
                  path: ['root', chromeNavLink1.id, chromeNavLink2.id],
                  deepLink: chromeNavLink2,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should not call serverless setNavigation when projectNavLinks is empty', async () => {
    mockProjectNavLinks.mockReturnValueOnce([]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).not.toHaveBeenCalled();
  });

  it('should not call serverless setNavigation when chrome navLinks is empty', async () => {
    mockChromeNavLinks.mockReturnValue([]);
    mockProjectNavLinks.mockReturnValueOnce([link1]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).not.toHaveBeenCalled();
  });

  it('should debounce updates', async () => {
    const id = 'expectedId' as SecurityPageName;
    const linkExpected = { ...link1, id };
    const chromeNavLinkExpected = { ...chromeNavLink1, id: `${APP_UI_ID}:${id}` };

    const chromeGetNavLinks$ = new BehaviorSubject([chromeNavLink1]);
    mockChromeGetNavLinks.mockReturnValue(chromeGetNavLinks$);

    mockChromeNavLinks.mockReturnValue([chromeNavLink1, chromeNavLink2, chromeNavLinkExpected]);
    mockProjectNavLinks.mockReturnValueOnce([linkExpected]);

    subscribeNavigationTree(testServices);

    chromeGetNavLinks$.next([chromeNavLink1]);
    chromeGetNavLinks$.next([chromeNavLink2]);
    chromeGetNavLinks$.next([chromeNavLinkExpected]);

    expect(testServices.serverless.setNavigation).not.toHaveBeenCalled();

    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledTimes(1);
    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLinkExpected.id,
              title: link1.title,
              path: ['root', chromeNavLinkExpected.id],
              deepLink: chromeNavLinkExpected,
            },
          ],
        },
      ],
    });
  });

  it('should not include links that are not in the chrome navLinks', async () => {
    mockChromeNavLinks.mockReturnValue([chromeNavLink2]);
    mockProjectNavLinks.mockReturnValueOnce([link1, link2]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLink2.id,
              title: link2.title,
              path: ['root', chromeNavLink2.id],
              deepLink: chromeNavLink2,
            },
          ],
        },
      ],
    });
  });

  it('should set hidden breadcrumb for blacklisted links', async () => {
    const chromeNavLinkTest = {
      ...chromeNavLink1,
      id: `${APP_UI_ID}:${SecurityPageName.usersEvents}`, // userEvents link is blacklisted
    };
    mockChromeNavLinks.mockReturnValue([chromeNavLinkTest, chromeNavLink2]);
    mockProjectNavLinks.mockReturnValueOnce([
      { ...link1, id: SecurityPageName.usersEvents },
      link2,
    ]);

    subscribeNavigationTree(testServices);
    await waitForDebounce();

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: [
            {
              id: chromeNavLinkTest.id,
              title: link1.title,
              path: ['root', chromeNavLinkTest.id],
              deepLink: chromeNavLinkTest,
              breadcrumbStatus: 'hidden',
            },
            {
              id: chromeNavLink2.id,
              title: link2.title,
              path: ['root', chromeNavLink2.id],
              deepLink: chromeNavLink2,
            },
          ],
        },
      ],
    });
  });
});
