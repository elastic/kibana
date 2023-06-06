/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { NavigationLink } from '@kbn/security-solution-plugin/public/common/links';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { getSecurityGetStartedComponent } from './components/get_started';
import { getSecuritySideNavComponent } from './components/side_navigation';
import {
  ServerlessSecurityPluginSetup,
  ServerlessSecurityPluginStart,
  ServerlessSecurityPluginSetupDependencies,
  ServerlessSecurityPluginStartDependencies,
  ServerlessSecurityPublicConfig,
} from './types';
import { registerUpsellings } from './components/upselling';
import { getNavTreeStructure, NavTreeStructure } from './hooks/use_nav_tree_structure';
import { findLinkWithId } from './hooks/use_nav_links';

export class ServerlessSecurityPlugin
  implements
    Plugin<
      ServerlessSecurityPluginSetup,
      ServerlessSecurityPluginStart,
      ServerlessSecurityPluginSetupDependencies,
      ServerlessSecurityPluginStartDependencies
    >
{
  private config: ServerlessSecurityPublicConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityPublicConfig>();
  }

  public setup(
    _core: CoreSetup,
    setupDeps: ServerlessSecurityPluginSetupDependencies
  ): ServerlessSecurityPluginSetup {
    registerUpsellings(setupDeps.securitySolution.upselling, this.config.productTypes);
    return {};
  }

  public start(
    core: CoreStart,
    startDeps: ServerlessSecurityPluginStartDependencies
  ): ServerlessSecurityPluginStart {
    const { securitySolution, serverless } = startDeps;

    securitySolution.setIsSidebarEnabled(false);
    securitySolution.setGetStartedPage(getSecurityGetStartedComponent(core, startDeps));
    serverless.setSideNavComponent(getSecuritySideNavComponent(core, startDeps));
    securitySolution.getNavLinks$().subscribe((navLinks) => {
      serverless.setNavigation({
        homeRef: '/security',
        // TODO wait for `projectNavigationTree` to be available in the API
        projectNavigationTree: getProjectNavigationTree(navLinks),
      });
    });

    return {};
  }

  public stop() {}
}

/**
 * Returns all the the navigation tree, including external links.
 * It will be used to automatically generate breadcrumbs.
 */
export const getProjectNavigationTree = (
  navLinks: NavigationLink[],
  navTreeStructure?: NavTreeStructure[]
  // TODO import `ProjectNavigationTreeDefinition` when it is available
): ProjectNavigationTreeDefinition[] => {
  const navTree = navTreeStructure ?? getNavTreeStructure(navLinks);
  return navTree.reduce<ProjectNavigationTreeDefinition>((items, { id, appId, links, label }) => {
    if (appId) {
      items.push({
        link: appId,
        title: label,
      });
      return items;
    }

    items.push({
      link: id,
      children: links
        ? getProjectNavigationTree(navLinks, links) // overwrites default nav links for the page
        : getNavLinkChildren(id, navLinks), // inherits default nav links for the page
    });

    return items;
  }, []);
};

const getNavLinkChildren = (navId: SecurityPageName, navLinks: NavigationLink[]) => {
  const navLink = findLinkWithId(navId, navLinks);
  return navLink?.links?.map(({ id }) => ({ id }));
};
