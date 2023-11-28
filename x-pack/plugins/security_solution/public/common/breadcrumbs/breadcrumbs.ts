/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { BreadcrumbsNav } from './types';

// Used to update the breadcrumbsNav$ observable internally.
const breadcrumbsNavUpdater$ = new BehaviorSubject<BreadcrumbsNav>({
  leading: [],
  trailing: [],
});

// The observable can be exposed by the plugin contract.
export const breadcrumbsNav$ = breadcrumbsNavUpdater$.asObservable();

export const updateBreadcrumbsNav = (breadcrumbsNav: BreadcrumbsNav) => {
  breadcrumbsNavUpdater$.next(breadcrumbsNav);
};
