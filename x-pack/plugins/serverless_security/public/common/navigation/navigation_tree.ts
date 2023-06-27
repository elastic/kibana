/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeNavLinks,
  ChromeProjectNavigation,
  ChromeProjectNavigationNode,
} from '@kbn/core-chrome-browser';
import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import { combineLatest, skipWhile, debounceTime } from 'rxjs';
import type { Services } from '../services';
import type { ProjectNavigationLink } from './links/types';

export const subscribeNavigationTree = (services: Services): void => {
  const { chrome, serverless, projectNavLinks$ } = services;

  combineLatest([
    projectNavLinks$.pipe(skipWhile((navLink) => navLink.length === 0)),
    chrome.navLinks.getNavLinks$().pipe(skipWhile((chromeNavLinks) => chromeNavLinks.length === 0)),
  ])
    .pipe(debounceTime(100)) // avoid multiple calls in a short time
    .subscribe(([navLinks]) => {
      const projectNavTree: ChromeProjectNavigation = {
        // The root link is temporary until the issue about having multiple links at first level is solved.
        // Replace it by:
        // navigationTree: formatChromeProjectNavNodes(chrome.navLinks, navLinks),
        navigationTree: [
          {
            id: 'root',
            title: 'Root',
            path: ['root'],
            breadcrumbStatus: 'hidden',
            children: formatChromeProjectNavNodes(chrome.navLinks, navLinks, ['root']),
          },
        ],
      };
      serverless.setNavigation(projectNavTree);
    });
};

const formatChromeProjectNavNodes = (
  chromeNavLinks: ChromeNavLinks,
  navLinks: ProjectNavigationLink[],
  path: string[] = []
): ChromeProjectNavigationNode[] => {
  return navLinks.reduce<ChromeProjectNavigationNode[]>((navNodes, navLink) => {
    const { id: deepLinkId, appId = APP_UI_ID, links, title } = navLink;

    const id = deepLinkId ? `${appId}:${deepLinkId}` : appId;

    if (chromeNavLinks.has(id)) {
      const link: ChromeProjectNavigationNode = {
        id,
        title,
        path: [...path, deepLinkId],
        deepLink: chromeNavLinks.get(id),
      };

      if (links?.length) {
        link.children = formatChromeProjectNavNodes(chromeNavLinks, links, link.path);
      }
      navNodes.push(link);
    }
    return navNodes;
  }, []);
};
