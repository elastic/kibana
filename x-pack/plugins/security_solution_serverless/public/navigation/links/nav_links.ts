/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, combineLatest, skipWhile, debounceTime, type Observable } from 'rxjs';
import type { ChromeNavLinks, CoreStart } from '@kbn/core/public';
import { SecurityPageName, type NavigationLink } from '@kbn/security-solution-navigation';
import { isExternalId } from '@kbn/security-solution-navigation/links';
import { mlNavCategories, mlNavLinks } from './sections/ml_links';
import { devToolsNavLink } from './sections/dev_tools_links';
import type { ProjectNavigationLink } from './types';
import { getNavLinkIdFromProjectPageName } from './util';

export const getProjectNavLinks$ = (
  securityNavLinks$: Observable<Array<NavigationLink<SecurityPageName>>>,
  core: CoreStart
): Observable<ProjectNavigationLink[]> => {
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
): ProjectNavigationLink[] => {
  const projectNavLinks: ProjectNavigationLink[] = [...securityNavLinks];

  // ML. injecting external sub-links and categories definition to the landing
  const mlLinkIndex = projectNavLinks.findIndex(({ id }) => id === SecurityPageName.mlLanding);
  if (mlLinkIndex !== -1) {
    projectNavLinks[mlLinkIndex] = {
      ...projectNavLinks[mlLinkIndex],
      categories: mlNavCategories,
      links: mlNavLinks,
    };
  }

  // Dev Tools. just pushing it
  projectNavLinks.push(devToolsNavLink);

  // TODO: Project Settings. Override "Settings" link

  return filterDisabled(projectNavLinks, chromeNavLinks);
};

/**
 * Filters out the disabled external nav links from the project nav links.
 * Internal Security links are already filtered by the security_solution plugin appLinks.
 */
const filterDisabled = (
  projectNavLinks: ProjectNavigationLink[],
  chromeNavLinks: ChromeNavLinks
): ProjectNavigationLink[] => {
  return projectNavLinks.reduce<ProjectNavigationLink[]>((filteredNavLinks, navLink) => {
    const { id, links } = navLink;
    if (isExternalId(id)) {
      const navLinkId = getNavLinkIdFromProjectPageName(id);
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
