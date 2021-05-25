/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BreadcrumbContext {
  breadcrumbs: Breadcrumb[];
  addCrumb: (crumb: Breadcrumb, parents?: Breadcrumb[]) => void;
  removeCrumb: (crumb: Breadcrumb) => void;
}
export interface Breadcrumb {
  text: string;
  href?: string;
}
