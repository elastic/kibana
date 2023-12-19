/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import type { Services } from '../../common/services';
import type { ProjectNavLinks } from '../links/types';
import { getFormatChromeProjectNavNodes } from './chrome_navigation_tree';

/**
 * This class is temporary until we can remove the chrome navigation tree and use only the formatNavigationTree
 */
export class ProjectNavigationTree {
  private projectNavLinks$: ProjectNavLinks;

  constructor(private readonly services: Services) {
    const { getProjectNavLinks$ } = this.services;
    this.projectNavLinks$ = getProjectNavLinks$();
  }

  public getChromeNavigationTree$(): Observable<ChromeProjectNavigationNode[]> {
    const formatChromeProjectNavNodes = getFormatChromeProjectNavNodes(this.services);
    return this.projectNavLinks$.pipe(
      map((projectNavLinks) => formatChromeProjectNavNodes(projectNavLinks))
    );
  }
}
