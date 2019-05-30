/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CRUD_APP_BASE_PATH } from '../constants';

export const listBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.listBreadcrumbTitle', {
    defaultMessage: 'Remote Clusters',
  }),
  href: `#${CRUD_APP_BASE_PATH}/list`,
};

export const buildListBreadcrumb = queryParams => {
  const { href } = listBreadcrumb;

  return {
    ...listBreadcrumb,
    href: `${href}${queryParams}`,
  };
};

export const addBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.addBreadcrumbTitle', {
    defaultMessage: 'Add',
  }),
};

export const editBreadcrumb = {
  text: i18n.translate('xpack.remoteClusters.editBreadcrumbTitle', {
    defaultMessage: 'Edit',
  }),
};
