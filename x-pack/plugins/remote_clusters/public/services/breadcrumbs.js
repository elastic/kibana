/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CRUD_APP_BASE_PATH } from '../constants';

// TODO: Use chrome.breadcrumbs service to surface these breadcrumbs once Management stops
// auto-generating breadcrumbs based on Angular router.
// Example: chrome.breadcrumbs.set([ listBreadcrumbLink, editBreadcrumb ]);

export const listBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.listBreadcrumbTitle', {
    defaultMessage: 'Remote Clusters',
  }),
};

export const listBreadcrumbLink = {
  ...listBreadcrumb,
  href: `#${CRUD_APP_BASE_PATH}`,
};

export const addBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.addBreadcrumbTitle', {
    defaultMessage: 'Add',
  }),
};

export const editBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.addBreadcrumbTitle', {
    defaultMessage: 'Edit',
  }),
};
