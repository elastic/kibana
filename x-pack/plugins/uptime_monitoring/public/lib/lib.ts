/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Breadcrumb } from 'ui/chrome';

export interface UMFrontendLibs {
  framework: UMFrameworkAdapter;
}

export type UMUpdateBreadcrumbs = (breadcrumbs: Breadcrumb[]) => void;

export interface UptimeAppProps {
  isUsingK7Design: boolean;
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  kibanaBreadcrumbs: Breadcrumb[];
}

export type BootstrapUptimeApp = (props: UptimeAppProps) => React.ReactElement<any>;

export interface UMFrameworkAdapter {
  render(component: BootstrapUptimeApp): void;
  setBreadcrumbs(breadcrumbs: any[]): void;
}
