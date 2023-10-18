/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { NavigationTreeDefinition } from '@kbn/shared-ux-chrome-navigation';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import type { Services } from '../../common/services';
import type { ProjectNavLinks, ProjectPageName } from '../links/types';
import { getFormatChromeProjectNavNodes } from './chrome_navigation_tree';
import { formatNavigationTree } from './navigation_tree';
import { CATEGORIES } from '../categories';

const projectCategories = CATEGORIES as Array<LinkCategory<ProjectPageName>>;

/**
 * This class is temporary until we can remove the chrome navigation tree and use only the formatNavigationTree
 */
export class ProjectNavigationTree {
  private projectNavLinks$: ProjectNavLinks;

  constructor(private readonly services: Services) {
    const { getProjectNavLinks$ } = this.services;
    this.projectNavLinks$ = getProjectNavLinks$();
  }

  public getNavigationTree$(): Observable<NavigationTreeDefinition> {
    return this.projectNavLinks$.pipe(
      map((projectNavLinks) => formatNavigationTree(projectNavLinks, projectCategories))
    );
  }

  public getChromeNavigationTree$(): Observable<ChromeProjectNavigationNode[]> {
    const formatChromeProjectNavNodes = getFormatChromeProjectNavNodes(this.services);
    return this.projectNavLinks$.pipe(
      map((projectNavLinks) => formatChromeProjectNavNodes(projectNavLinks))
    );
  }
}
