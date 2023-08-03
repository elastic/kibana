/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeNavLink } from '@kbn/core/public';
import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import type { NavigationLink } from '@kbn/security-solution-navigation';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { getProjectNavLinks$ } from './nav_links';
import { BehaviorSubject, firstValueFrom, take } from 'rxjs';
import { mockServices } from '../../common/services/__mocks__/services.mock';
import { mlNavCategories, mlNavLinks } from './sections/ml_links';
import { ExternalPageName } from './constants';
import type { ProjectNavigationLink } from './types';

const mockChromeNavLinks = jest.fn((): ChromeNavLink[] => []);
const mockChromeGetNavLinks = jest.fn(() => new BehaviorSubject(mockChromeNavLinks()));
const mockChromeNavLinksHas = jest.fn((id: string): boolean =>
  mockChromeNavLinks().some((link) => link.id === id)
);
const testServices = {
  ...mockServices,
  chrome: {
    ...mockServices.chrome,
    navLinks: {
      ...mockServices.chrome.navLinks,
      has: mockChromeNavLinksHas,
      getNavLinks$: mockChromeGetNavLinks,
    },
  },
};

const link1Id = 'link-1' as SecurityPageName;
const link2Id = 'link-2' as SecurityPageName;

const link1: NavigationLink<SecurityPageName> = { id: link1Id, title: 'link 1' };
const link2: NavigationLink<SecurityPageName> = { id: link2Id, title: 'link 2' };
const linkMlLanding: NavigationLink<SecurityPageName> = {
  id: SecurityPageName.mlLanding,
  title: 'ML Landing',
  links: [],
};
const projectLinkDevTools: ProjectNavigationLink = {
  id: ExternalPageName.devTools,
  title: 'Dev Tools',
};

const chromeNavLink1: ChromeNavLink = {
  id: `${APP_UI_ID}:${link1.id}`,
  title: link1.title,
  href: '/link1',
  url: '/link1',
  baseUrl: '',
};
const devToolsNavLink: ChromeNavLink = {
  id: 'dev_tools',
  title: 'Dev Tools',
  href: '/dev_tools',
  url: '/dev_tools',
  baseUrl: '',
};

describe('getProjectNavLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeNavLinks.mockReturnValue([chromeNavLink1]);
    mockChromeNavLinksHas.mockImplementation((id: string): boolean =>
      mockChromeNavLinks().some((link) => link.id === id)
    );
  });

  it('should return security nav links with all external links filtered', async () => {
    mockChromeNavLinksHas.mockReturnValue(false); // no external links exist
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2]);

    const projectNavLinks$ = getProjectNavLinks$(testSecurityNavLinks$, testServices);
    const value = await firstValueFrom(projectNavLinks$.pipe(take(1)));
    expect(value).toEqual([link1, link2]);
  });

  it('should add devTools nav link if chrome nav link exists', async () => {
    mockChromeNavLinks.mockReturnValue([devToolsNavLink]);
    const testSecurityNavLinks$ = new BehaviorSubject([link1]);

    const projectNavLinks$ = getProjectNavLinks$(testSecurityNavLinks$, testServices);

    const value = await firstValueFrom(projectNavLinks$.pipe(take(1)));
    expect(value).toEqual([link1, projectLinkDevTools]);
  });

  it('should add machineLearning landing nav link filtering all external links', async () => {
    mockChromeNavLinks.mockReturnValue([chromeNavLink1]);
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2, linkMlLanding]);

    const projectNavLinks$ = getProjectNavLinks$(testSecurityNavLinks$, testServices);

    const value = await firstValueFrom(projectNavLinks$.pipe(take(1)));
    expect(value).toEqual([
      link1,
      link2,
      expect.objectContaining({ id: SecurityPageName.mlLanding, links: [] }),
    ]);
  });

  it('should add machineLearning and devTools nav links with all external links present', async () => {
    mockChromeNavLinksHas.mockReturnValue(true); // all external links exist
    const testSecurityNavLinks$ = new BehaviorSubject([link1, link2, linkMlLanding]);

    const projectNavLinks$ = getProjectNavLinks$(testSecurityNavLinks$, testServices);

    const value = await firstValueFrom(projectNavLinks$.pipe(take(1)));
    expect(value).toEqual([
      link1,
      link2,
      { ...linkMlLanding, categories: mlNavCategories, links: mlNavLinks },
      projectLinkDevTools,
    ]);
  });
});
