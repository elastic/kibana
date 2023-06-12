/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ChromeBreadcrumb } from '@kbn/core/public';

export interface BreadcrumbsNavigation {
  trailing: ChromeBreadcrumb[];
  leading: ChromeBreadcrumb[];
}

const breadcrumbsNavigationUpdater$ = new BehaviorSubject<BreadcrumbsNavigation>([]);
export const breadcrumbsNavigation$ = breadcrumbsNavigationUpdater$.asObservable();

export const updateBreadcrumbsNavigation = (breadcrumbs: BreadcrumbsNavigation) => {
  breadcrumbsNavigationUpdater$.next(breadcrumbs);
};
