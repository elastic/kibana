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
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { assetsNavLinks } from './sections/assets_links';
import { mlNavCategories, mlNavLinks } from './sections/ml_links';
import {
  projectSettingsNavCategories,
  projectSettingsNavLinks,
} from './sections/project_settings_links';
import { devToolsNavLink } from './sections/dev_tools_links';
import type { ProjectNavigationLink } from './types';
import { getCloudLinkKey, getCloudUrl, getNavLinkIdFromProjectPageName, isCloudLink } from './util';
import { investigationsNavLinks } from './sections/investigations_links';

export const createProjectNavLinks$ = (
  securityNavLinks$: Observable<Array<NavigationLink<SecurityPageName>>>,
  core: CoreStart,
  cloud: CloudStart
): Observable<ProjectNavigationLink[]> => {
  const { chrome } = core;
  return combineLatest([securityNavLinks$, chrome.navLinks.getNavLinks$()]).pipe(
    debounceTime(100), // avoid multiple calls in a short period of time
    skipWhile(
      ([securityNavLinks, chromeNavLinks]) =>
        securityNavLinks.length === 0 || chromeNavLinks.length === 0 // skip if not initialized
    ),
    map(([securityNavLinks]) => processNavLinks(securityNavLinks, chrome.navLinks, cloud))
  );
};

/**
 * Takes the security nav links and the chrome nav links and generates the project nav links
 * containing Security internal nav links and the external nav links (ML, Dev Tools, Project Settings, etc.)
 */
const processNavLinks = (
  securityNavLinks: Array<NavigationLink<SecurityPageName>>,
  chromeNavLinks: ChromeNavLinks,
  cloud: CloudStart
): ProjectNavigationLink[] => {
  const projectNavLinks: ProjectNavigationLink[] = [...securityNavLinks];

  // Investigations. injecting external sub-links and categories definition to the landing
  const investigationsLinkIndex = projectNavLinks.findIndex(
    ({ id }) => id === SecurityPageName.investigations
  );
  if (investigationsLinkIndex !== -1) {
    const investigationNavLink = projectNavLinks[investigationsLinkIndex];
    projectNavLinks[investigationsLinkIndex] = {
      ...investigationNavLink,
      links: [...(investigationNavLink.links ?? []), ...investigationsNavLinks],
    };
  }

  // ML. injecting external sub-links and categories definition to the landing
  const mlLinkIndex = projectNavLinks.findIndex(({ id }) => id === SecurityPageName.mlLanding);
  if (mlLinkIndex !== -1) {
    projectNavLinks[mlLinkIndex] = {
      ...projectNavLinks[mlLinkIndex],
      categories: mlNavCategories,
      links: mlNavLinks,
    };
  }

  // Assets, adding fleet external sub-links
  const assetsLinkIndex = projectNavLinks.findIndex(({ id }) => id === SecurityPageName.assets);
  if (assetsLinkIndex !== -1) {
    const assetsNavLink = projectNavLinks[assetsLinkIndex];
    projectNavLinks[assetsLinkIndex] = {
      ...assetsNavLink,
      links: [...assetsNavLinks, ...(assetsNavLink.links ?? [])], // adds fleet to the existing (endpoints and cloud) links
    };
  }

  // Project Settings, adding all external sub-links
  const projectSettingsLinkIndex = projectNavLinks.findIndex(
    ({ id }) => id === SecurityPageName.projectSettings
  );
  if (projectSettingsLinkIndex !== -1) {
    const projectSettingsNavLink = projectNavLinks[projectSettingsLinkIndex];
    projectNavLinks[projectSettingsLinkIndex] = {
      ...projectSettingsNavLink,
      categories: projectSettingsNavCategories,
      links: [...projectSettingsNavLinks, ...(projectSettingsNavLink.links ?? [])],
    };
  }

  // Dev Tools. just pushing it
  projectNavLinks.push(devToolsNavLink);

  return processCloudLinks(filterDisabled(projectNavLinks, chromeNavLinks), cloud);
};

/**
 * Filters out the disabled external kibana nav links from the project nav links.
 * Internal Security links are already filtered by the security_solution plugin appLinks.
 */
const filterDisabled = (
  projectNavLinks: ProjectNavigationLink[],
  chromeNavLinks: ChromeNavLinks
): ProjectNavigationLink[] => {
  return projectNavLinks.reduce<ProjectNavigationLink[]>((filteredNavLinks, navLink) => {
    const { id, links } = navLink;
    if (!isSecurityId(id) && !isCloudLink(id)) {
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

const processCloudLinks = (
  links: ProjectNavigationLink[],
  cloud: CloudStart
): ProjectNavigationLink[] => {
  return links.map((link) => {
    const extraProps: Partial<ProjectNavigationLink> = {};
    if (isCloudLink(link.id)) {
      const externalUrl = getCloudUrl(getCloudLinkKey(link.id), cloud);
      extraProps.externalUrl = externalUrl || '#'; // fallback to # if empty, should only happen in dev
    }
    if (link.links) {
      extraProps.links = processCloudLinks(link.links, cloud);
    }
    return {
      ...link,
      ...extraProps,
    };
  });
};
