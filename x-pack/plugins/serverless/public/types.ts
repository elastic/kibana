/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeProjectBreadcrumb,
  ChromeProjectNavigation,
  ChromeSetProjectBreadcrumbsParams,
  SideNavComponent,
  ChromeProjectNavigationNode,
  ProjectNavigationDefinition,
  AppDeepLinkId,
} from '@kbn/core-chrome-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessPluginSetup {}

export interface ServerlessPluginStart {
  setBreadcrumbs: (
    breadcrumbs: ChromeProjectBreadcrumb | ChromeProjectBreadcrumb[],
    params?: Partial<ChromeSetProjectBreadcrumbsParams>
  ) => void;
  setNavigationDeprecated(projectNavigation: ChromeProjectNavigation): void;
  setNavigation<
    LinkId extends AppDeepLinkId = AppDeepLinkId,
    Id extends string = string,
    ChildrenId extends string = Id
  >(
    definition: ProjectNavigationDefinition<LinkId, Id, ChildrenId>
  ): void;
  setProjectHome(homeHref: string): void;
  setSideNavComponentDeprecated: (navigation: SideNavComponent) => void;
  getActiveNavigationNodes$: () => Observable<ChromeProjectNavigationNode[][]>;
}

export interface ServerlessPluginSetupDependencies {
  cloud: CloudSetup;
}

export interface ServerlessPluginStartDependencies {
  cloud: CloudStart;
}
