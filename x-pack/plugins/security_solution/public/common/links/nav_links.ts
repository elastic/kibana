/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, map } from 'rxjs';
import { appLinks$ } from './links';
import type { SecurityPageName } from '../../app/types';
import type { SecurityNavLink, AppLinkItems, NavigationLink } from './types';

export const formatNavigationLinks = (appLinks: AppLinkItems): SecurityNavLink[] =>
  appLinks.map<SecurityNavLink>((link) => ({
    id: link.id,
    title: link.title,
    ...(link.categories != null && { categories: link.categories }),
    ...(link.description != null && { description: link.description }),
    ...(link.sideNavDisabled === true && { disabled: true }),
    ...(link.landingIcon != null && { landingIcon: link.landingIcon }),
    ...(link.landingImage != null && { landingImage: link.landingImage }),
    ...(link.sideNavIcon != null && { sideNavIcon: link.sideNavIcon }),
    ...(link.sideNavFooter != null && { isFooterLink: link.sideNavFooter }),
    ...(link.skipUrlState != null && { skipUrlState: link.skipUrlState }),
    ...(link.isBeta != null && { isBeta: link.isBeta }),
    ...(link.betaOptions != null && { betaOptions: link.betaOptions }),
    ...(link.links?.length && {
      links: formatNavigationLinks(link.links),
    }),
  }));

/**
 * Navigation links observable based on Security AppLinks,
 * It is used to generate the side navigation items
 */
export const internalNavLinks$ = appLinks$.pipe(map(formatNavigationLinks));

export const navLinksUpdater$ = new BehaviorSubject<NavigationLink[]>([]);
export const navLinks$ = navLinksUpdater$.asObservable();

let currentSubscription: Subscription;
export const updateNavLinks = (isSolutionNavEnabled: boolean, core: CoreStart) => {
  if (currentSubscription) {
    currentSubscription.unsubscribe();
  }
  if (isSolutionNavEnabled) {
    // import solution nav links only when solution nav is enabled
    lazyLoadSolutionNavLinks().then((createSolutionNavLinks$) => {
      currentSubscription = createSolutionNavLinks$(internalNavLinks$, core).subscribe((links) => {
        navLinksUpdater$.next(links);
      });
    });
  } else {
    currentSubscription = internalNavLinks$.subscribe((links) => {
      navLinksUpdater$.next(links);
    });
  }
};

// includes internal security links only
export const useSecurityInternalNavLinks = (): SecurityNavLink[] => {
  return useObservable(internalNavLinks$, []);
};

// includes internal security links and externals links to other applications such as discover, ml, etc.
export const useNavLinks = (): NavigationLink[] => {
  return useObservable(navLinks$, navLinksUpdater$.value); // use default value from updater subject to prevent re-renderings
};

export const useRootNavLink = (linkId: SecurityPageName): NavigationLink | undefined => {
  return useNavLinks().find(({ id }) => id === linkId);
};

const lazyLoadSolutionNavLinks = async () =>
  import(
    /* webpackChunkName: "solutionNavLinks" */
    '../../app/solution_navigation/links/nav_links'
  ).then(({ createSolutionNavLinks$ }) => createSolutionNavLinks$);
