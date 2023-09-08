/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeNavLink } from '@kbn/core/public';
import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { subscribeNavigationTree } from './navigation_tree';
import { mockServices, mockProjectNavLinks } from '../common/services/__mocks__/services.mock';
import type { ProjectNavigationLink } from './links/types';
import type { ExternalPageName } from './links/constants';
import * as ml from '@kbn/default-nav-ml';

jest.mock('@kbn/default-nav-ml');

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;
const link3Id = 'externalAppId:link-1' as ExternalPageName;

const link1: ProjectNavigationLink = { id: link1Id, title: 'link 1' };
const link2: ProjectNavigationLink = { id: link2Id, title: 'link 2' };
const link3: ProjectNavigationLink = { id: link3Id, title: 'link 3' };

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
const chromeNavLink3: ChromeNavLink = {
  id: link3.id,
  title: link3.title,
  href: '/link3',
  url: '/link3',
  baseUrl: '',
};
const chromeNavLinkMl1: ChromeNavLink = {
  id: 'ml:subLink-1',
  title: 'ML subLink 1',
  href: '/ml/link1',
  url: '/ml/link1',
  baseUrl: '',
};
const chromeNavLinkMl2: ChromeNavLink = {
  id: 'ml:subLink-2',
  title: 'ML subLink 2',
  href: '/ml/link2',
  url: '/ml/link2',
  baseUrl: '',
};
const defaultNavCategory1 = {
  id: 'category_one',
  title: 'ML Category1',
};

(ml as { defaultNavigation: unknown }).defaultNavigation = {
  children: [
    {
      id: 'root',
      children: [
        {
          link: chromeNavLinkMl1.id,
        },
      ],
    },
    {
      ...defaultNavCategory1,
      children: [
        {
          title: 'Overridden ML SubLink 2',
          link: chromeNavLinkMl2.id,
        },
      ],
    },
  ],
};

let chromeNavLinks: ChromeNavLink[] = [];
const mockChromeNavLinksGet = jest.fn((id: string): ChromeNavLink | undefined =>
  chromeNavLinks.find((link) => link.id === id)
);
const mockChromeNavLinksHas = jest.fn((id: string): boolean =>
  chromeNavLinks.some((link) => link.id === id)
);

const testServices = {
  ...mockServices,
  chrome: {
    ...mockServices.chrome,
    navLinks: {
      ...mockServices.chrome.navLinks,
      get: mockChromeNavLinksGet,
      has: mockChromeNavLinksHas,
    },
  },
};

describe('subscribeNavigationTree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chromeNavLinks = [chromeNavLink1, chromeNavLink2, chromeNavLink3];
  });

  it('should call serverless setNavigation', async () => {
    mockProjectNavLinks.mockReturnValueOnce([link1]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLink1.id,
          title: link1.title,
          path: [chromeNavLink1.id],
          deepLink: chromeNavLink1,
        },
      ],
    });
  });

  it('should call serverless setNavigation with external link', async () => {
    mockProjectNavLinks.mockReturnValueOnce([link3]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLink3.id,
          title: chromeNavLink3.title,
          path: [chromeNavLink3.id],
          deepLink: chromeNavLink3,
        },
      ],
    });
  });

  it('should call serverless setNavigation with nested children', async () => {
    mockProjectNavLinks.mockReturnValueOnce([{ ...link1, links: [link2] }]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLink1.id,
          title: link1.title,
          path: [chromeNavLink1.id],
          deepLink: chromeNavLink1,
          children: [
            {
              id: chromeNavLink2.id,
              title: link2.title,
              path: [chromeNavLink1.id, chromeNavLink2.id],
              deepLink: chromeNavLink2,
            },
          ],
        },
      ],
    });
  });

  it('should add default nav for ML page', async () => {
    const chromeNavLinkTest = {
      ...chromeNavLink1,
      id: `${APP_UI_ID}:${SecurityPageName.mlLanding}`,
    };
    chromeNavLinks = [chromeNavLinkTest, chromeNavLinkMl1, chromeNavLinkMl2];
    mockProjectNavLinks.mockReturnValueOnce([{ ...link1, id: SecurityPageName.mlLanding }]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLinkTest.id,
          title: link1.title,
          path: [chromeNavLinkTest.id],
          deepLink: chromeNavLinkTest,
          children: [
            {
              id: chromeNavLinkMl1.id,
              title: chromeNavLinkMl1.title,
              path: [chromeNavLinkTest.id, chromeNavLinkMl1.id],
              deepLink: chromeNavLinkMl1,
            },
            {
              id: defaultNavCategory1.id,
              title: defaultNavCategory1.title,
              path: [chromeNavLinkTest.id, defaultNavCategory1.id],
              children: [
                {
                  id: chromeNavLinkMl2.id,
                  title: 'Overridden ML SubLink 2',
                  path: [chromeNavLinkTest.id, defaultNavCategory1.id, chromeNavLinkMl2.id],
                  deepLink: chromeNavLinkMl2,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should not include links that are not in the chrome navLinks', async () => {
    chromeNavLinks = [chromeNavLink2];
    mockProjectNavLinks.mockReturnValueOnce([link1, link2]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLink2.id,
          title: link2.title,
          path: [chromeNavLink2.id],
          deepLink: chromeNavLink2,
        },
      ],
    });
  });

  it('should set hidden breadcrumb for blacklisted links', async () => {
    const chromeNavLinkTest = {
      ...chromeNavLink1,
      id: `${APP_UI_ID}:${SecurityPageName.usersEvents}`, // userEvents link is blacklisted
    };
    chromeNavLinks = [chromeNavLinkTest, chromeNavLink2];
    mockProjectNavLinks.mockReturnValueOnce([
      { ...link1, id: SecurityPageName.usersEvents },
      link2,
    ]);

    subscribeNavigationTree(testServices);

    expect(testServices.serverless.setNavigation).toHaveBeenCalledWith({
      navigationTree: [
        {
          id: chromeNavLinkTest.id,
          title: link1.title,
          path: [chromeNavLinkTest.id],
          deepLink: chromeNavLinkTest,
          breadcrumbStatus: 'hidden',
        },
        {
          id: chromeNavLink2.id,
          title: link2.title,
          path: [chromeNavLink2.id],
          deepLink: chromeNavLink2,
        },
      ],
    });
  });
});
