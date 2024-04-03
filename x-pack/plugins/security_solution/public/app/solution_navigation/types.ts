/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { SolutionSideNavItem as ClassicSolutionSideNavItem } from '@kbn/security-solution-side-nav';
import type { LinkCategory, NavigationLink } from '@kbn/security-solution-navigation';
import type {
  ExternalPageName,
  SecurityPageName,
} from '@kbn/security-solution-navigation/src/constants';

export type SolutionPageName = SecurityPageName | ExternalPageName;

export type SolutionNavLink = NavigationLink<SolutionPageName>;
export type SolutionNavLinks$ = Observable<SolutionNavLink[]>;
export type SolutionLinkCategory = LinkCategory<SolutionPageName>;

export type SolutionSideNavItem = ClassicSolutionSideNavItem<SolutionPageName>;
