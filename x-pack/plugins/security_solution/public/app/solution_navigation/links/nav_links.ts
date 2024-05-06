/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, combineLatest, skipWhile, debounceTime, type Observable } from 'rxjs';
import type { ChromeNavLinks, CoreStart } from '@kbn/core/public';
import { SecurityPageName, type NavigationLink } from '@kbn/security-solution-navigation';
import { isSecurityId } from '@kbn/security-solution-navigation/links';
import { assetsNavLinks } from './sections/assets_links';
import { mlNavCategories, mlNavLinks } from './sections/ml_links';
import { settingsNavLinks } from './sections/settings_links';
import { devToolsNavLink } from './sections/dev_tools_links';
import { discoverNavLink } from './sections/discover_links';
import type { SolutionNavLink } from '../../../common/links';
import { getNavLinkIdFromSolutionPageName } from '../util';
import { investigationsNavLinks } from './sections/investigations_links';

export const createSolutionNavLinks$ = (
  securityNavLinks$: Observable<Array<NavigationLink<SecurityPageName>>>,
  core: CoreStart
): Observable<SolutionNavLink[]> => {
  const { chrome } = core;
  return combineLatest([securityNavLinks$, chrome.navLinks.getNavLinks$()]).pipe(
    debounceTime(100), // avoid multiple calls in a short period of time
    skipWhile(
      ([securityNavLinks, chromeNavLinks]) =>
        securityNavLinks.length === 0 || chromeNavLinks.length === 0 // skip if not initialized
    ),
    map(([securityNavLinks]) => processNavLinks(securityNavLinks, chrome.navLinks))
  );
};

/**
 * Takes the security nav links and the chrome nav links and generates the project nav links
 * containing Security internal nav links and the external nav links (ML, Dev Tools, Project Settings, etc.)
 */
const processNavLinks = (
  securityNavLinks: Array<NavigationLink<SecurityPageName>>,
  chromeNavLinks: ChromeNavLinks
): SolutionNavLink[] => {
  const solutionNavLinks: SolutionNavLink[] = [...securityNavLinks];

  // Discover. just pushing it
  solutionNavLinks.push(discoverNavLink);

  // Investigations. injecting external sub-links and categories definition to the landing
  const investigationsLinkIndex = solutionNavLinks.findIndex(
    ({ id }) => id === SecurityPageName.investigations
  );
  if (investigationsLinkIndex !== -1) {
    const investigationNavLink = solutionNavLinks[investigationsLinkIndex];
    solutionNavLinks[investigationsLinkIndex] = {
      ...investigationNavLink,
      links: [...(investigationNavLink.links ?? []), ...investigationsNavLinks],
    };
  }

  // ML. injecting external sub-links and categories definition to the landing
  const mlLinkIndex = solutionNavLinks.findIndex(({ id }) => id === SecurityPageName.mlLanding);
  if (mlLinkIndex !== -1) {
    solutionNavLinks[mlLinkIndex] = {
      ...solutionNavLinks[mlLinkIndex],
      categories: mlNavCategories,
      links: mlNavLinks,
    };
  }

  // Assets, adding fleet external sub-links
  const assetsLinkIndex = solutionNavLinks.findIndex(({ id }) => id === SecurityPageName.assets);
  if (assetsLinkIndex !== -1) {
    const assetsNavLink = solutionNavLinks[assetsLinkIndex];
    solutionNavLinks[assetsLinkIndex] = {
      ...assetsNavLink,
      links: [...assetsNavLinks, ...(assetsNavLink.links ?? [])], // adds fleet to the existing (endpoints and cloud) links
    };
  }

  // Dev Tools. just pushing it
  solutionNavLinks.push(devToolsNavLink);
  solutionNavLinks.push(...settingsNavLinks);

  return filterDisabled(solutionNavLinks, chromeNavLinks);
};

/**
 * Filters out the disabled external kibana nav links from the project nav links.
 * Internal Security links are already filtered by the security_solution plugin appLinks.
 */
const filterDisabled = (
  solutionNavLinks: SolutionNavLink[],
  chromeNavLinks: ChromeNavLinks
): SolutionNavLink[] => {
  return solutionNavLinks.reduce<SolutionNavLink[]>((filteredNavLinks, navLink) => {
    const { id, links } = navLink;
    if (!isSecurityId(id)) {
      const navLinkId = getNavLinkIdFromSolutionPageName(id);
      if (!chromeNavLinks.has(navLinkId)) {
        return filteredNavLinks;
      }
    }
    if (links) {
      filteredNavLinks.push({ ...navLink, links: filterDisabled(links, chromeNavLinks) });
    } else {
      filteredNavLinks.push(navLink);
    }
    return filteredNavLinks;
  }, []);
};
