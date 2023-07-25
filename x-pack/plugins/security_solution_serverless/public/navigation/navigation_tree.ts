/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeNavLinks, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import { combineLatest, skipWhile, debounceTime } from 'rxjs';
import type { Services } from '../common/services';
import type { ProjectNavigationLink } from './links/types';

// We need to hide breadcrumbs for some pages (tabs) because they appear duplicated.
// These breadcrumbs are incorrectly processed as trailing breadcrumbs in SecuritySolution, because of `SpyRoute` architecture limitations.
// They are navLinks tree with a SecurityPageName, so they should be treated as leading breadcrumbs in ESS as well.
// TODO: Improve the breadcrumbs logic in `use_breadcrumbs_nav` to avoid this workaround.
const HIDDEN_BREADCRUMBS = new Set<SecurityPageName>([
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
  const { chrome, serverless, getProjectNavLinks$ } = services;

  combineLatest([
    getProjectNavLinks$().pipe(skipWhile((navLink) => navLink.length === 0)),
    chrome.navLinks.getNavLinks$().pipe(skipWhile((chromeNavLinks) => chromeNavLinks.length === 0)),
  ])
    .pipe(debounceTime(100)) // avoid multiple calls in a short time
    .subscribe(([projectNavLinks]) => {
      // The root link is temporary until the issue about having multiple links at first level is solved.
      // TODO: Assign the navigationTree nodes when the issue is solved:
      // const navigationTree = formatChromeProjectNavNodes(chrome.navLinks, projectNavLinks),
      const navigationTree: ChromeProjectNavigationNode[] = [
        {
          id: 'root',
          title: 'Root',
          path: ['root'],
          breadcrumbStatus: 'hidden',
          children: formatChromeProjectNavNodes(chrome.navLinks, projectNavLinks, ['root']),
        },
      ];
      serverless.setNavigation({ navigationTree });
    });
};

const formatChromeProjectNavNodes = (
  chromeNavLinks: ChromeNavLinks,
  projectNavLinks: ProjectNavigationLink[],
  path: string[] = []
): ChromeProjectNavigationNode[] =>
  projectNavLinks.reduce<ChromeProjectNavigationNode[]>((navNodes, navLink) => {
    const { id: deepLinkId, appId = APP_UI_ID, links, title } = navLink;

    const id = deepLinkId ? `${appId}:${deepLinkId}` : appId;

    if (chromeNavLinks.has(id)) {
      const breadcrumbHidden = appId === APP_UI_ID && HIDDEN_BREADCRUMBS.has(deepLinkId);
      const link: ChromeProjectNavigationNode = {
        id,
        title,
        path: [...path, id],
        deepLink: chromeNavLinks.get(id),
        ...(breadcrumbHidden && { breadcrumbStatus: 'hidden' }),
      };

      if (links?.length) {
        link.children = formatChromeProjectNavNodes(chromeNavLinks, links, link.path);
      }
      navNodes.push(link);
    }
    return navNodes;
  }, []);
