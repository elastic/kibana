/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, type Observable } from 'rxjs';
import type { NavigationLink } from '@kbn/security-solution-plugin/public';
import type { ProjectNavLinks, ProjectNavigationLink } from './types';

export const getProjectNavLinks$ = (navLinks$: Observable<NavigationLink[]>): ProjectNavLinks => {
  return navLinks$.pipe(map(processNavLinks));
};

// TODO: This is a placeholder function that will be used to process the nav links,
// It will mix internal Security nav links with the external links to other plugins, in the correct order.
const processNavLinks = (navLinks: NavigationLink[]): ProjectNavigationLink[] => navLinks;
