/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export interface UMBreadcrumb {
  text: string;
  href?: string;
}

const makeOverviewBreadcrumb = (search?: string): UMBreadcrumb => ({
  text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
    defaultMessage: 'Uptime',
  }),
  href: `#/${search ? search : ''}`,
});

export const getOverviewPageBreadcrumbs = (search?: string): UMBreadcrumb[] => [
  makeOverviewBreadcrumb(search),
];

export const getMonitorPageBreadcrumb = (name: string, search?: string): UMBreadcrumb[] => [
  makeOverviewBreadcrumb(search),
  { text: name },
];
