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

export const monitorBreadcrumb: UMBreadcrumb = {
  text: i18n.translate('xpack.uptime.breadcrumbs.monitorBreadcrumbText', {
    defaultMessage: 'Monitor',
  }),
};

export const overviewBreadcrumb: UMBreadcrumb = {
  text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
    defaultMessage: 'Overview',
  }),
  href: '#/',
};

export const getOverviewPageBreadcrumbs = (): UMBreadcrumb[] => [overviewBreadcrumb];

export const getMonitorPageBreadcrumb = (): UMBreadcrumb[] => [
  overviewBreadcrumb,
  monitorBreadcrumb,
];
