/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeProjectNavigationNode, NodeDefinition } from '@kbn/core-chrome-browser';
import { defaultNavigation as mlDefaultNav } from '@kbn/default-nav-ml';
import { defaultNavigation as devToolsDefaultNav } from '@kbn/default-nav-devtools';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import type { Services } from '../common/services';
import type { ProjectNavigationLink, ProjectPageName } from './links/types';
import { getNavLinkIdFromProjectPageName } from './links/util';
import { ExternalPageName } from './links/constants';

// We need to hide breadcrumbs for some pages (tabs) because they appear duplicated.
// These breadcrumbs are incorrectly processed as trailing breadcrumbs in SecuritySolution, because of `SpyRoute` architecture limitations.
// They are navLinks tree with a SecurityPageName, so they should be treated as leading breadcrumbs in ESS as well.
// TODO: Improve the breadcrumbs logic in `use_breadcrumbs_nav` to avoid this workaround.
const HIDDEN_BREADCRUMBS = new Set<ProjectPageName>([
  SecurityPageName.networkDns,
  SecurityPageName.networkHttp,
  SecurityPageName.networkTls,
  SecurityPageName.networkAnomalies,
  SecurityPageName.networkEvents,
  SecurityPageName.usersAuthentications,
  SecurityPageName.usersAnomalies,
  SecurityPageName.usersRisk,
  SecurityPageName.usersEvents,
  SecurityPageName.uncommonProcesses,
  SecurityPageName.hostsAnomalies,
  SecurityPageName.hostsEvents,
  SecurityPageName.hostsRisk,
  SecurityPageName.sessions,
]);

export const subscribeNavigationTree = (services: Services): void => {
  const { serverless, getProjectNavLinks$ } = services;

  const formatChromeProjectNavNodes = getFormatChromeProjectNavNodes(services);

  // projectNavLinks$ updates when chrome.navLinks changes, no need to subscribe chrome.navLinks.getNavLinks$() again.
  getProjectNavLinks$().subscribe((projectNavLinks) => {
    const navigationTree = formatChromeProjectNavNodes(projectNavLinks);
    serverless.setNavigation({ navigationTree });
  });
};

// Closure to access the up to date chrome.navLinks from services
export const getFormatChromeProjectNavNodes = (services: Services) => {
  const formatChromeProjectNavNodes = (
    projectNavLinks: ProjectNavigationLink[],
    path: string[] = []
  ): ChromeProjectNavigationNode[] => {
    const { chrome } = services;
    return projectNavLinks.reduce<ChromeProjectNavigationNode[]>((navNodes, navLink) => {
      const { id, title, links } = navLink;
      const navLinkId = getNavLinkIdFromProjectPageName(id);

      if (chrome.navLinks.has(navLinkId)) {
        const breadcrumbHidden = HIDDEN_BREADCRUMBS.has(id);
        const link: ChromeProjectNavigationNode = {
          id: navLinkId,
          title,
          path: [...path, navLinkId],
          deepLink: chrome.navLinks.get(navLinkId),
          ...(breadcrumbHidden && { breadcrumbStatus: 'hidden' }),
        };
        // check default navigation for children
        const defaultChildrenNav = getDefaultChildrenNav(id, link);
        if (defaultChildrenNav) {
          link.children = defaultChildrenNav;
        } else if (links?.length) {
          link.children = formatChromeProjectNavNodes(links, link.path);
        }
        navNodes.push(link);
      }
      return navNodes;
    }, []);
  };

  const getDefaultChildrenNav = (
    id: ProjectPageName,
    link: ChromeProjectNavigationNode
  ): ChromeProjectNavigationNode[] | undefined => {
    if (id === SecurityPageName.mlLanding) {
      return processDefaultNav(mlDefaultNav.children, link.path);
    }
    if (id === ExternalPageName.devTools) {
      return processDefaultNav(devToolsDefaultNav.children, link.path);
    }
    return undefined;
  };

  const processDefaultNav = (
    children: NodeDefinition[],
    path: string[]
  ): ChromeProjectNavigationNode[] => {
    const { chrome } = services;
    return children.reduce<ChromeProjectNavigationNode[]>((navNodes, node) => {
      const id = node.id ?? node.link;
      if (!id) {
        return navNodes;
      }
      if (id === 'root') {
        if (node.children) {
          navNodes.push(...processDefaultNav(node.children, path));
        }
        return navNodes;
      }
      const navNode: ChromeProjectNavigationNode = {
        id,
        title: node.title || '',
        path: [...path, id],
      };
      if (chrome.navLinks.has(id)) {
        const deepLink = chrome.navLinks.get(id);
        navNode.deepLink = deepLink;
        if (!navNode.title) {
          navNode.title = deepLink?.title || '';
        }
      }
      if (node.children?.length) {
        navNode.children = processDefaultNav(node.children, navNode.path);
      }
      navNodes.push(navNode);
      return navNodes;
    }, []);
  };

  return formatChromeProjectNavNodes;
};
