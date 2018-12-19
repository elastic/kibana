/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CRUD_APP_BASE_PATH } from '../constants';

export const listBreadcrumb = {
  text: i18n.translate('xpack.rollupJobs.listBreadcrumbTitle', {
    defaultMessage: 'Rollups Jobs',
  }),
  href: `#${CRUD_APP_BASE_PATH}`,
};

export const createBreadcrumb = {
  text: i18n.translate('xpack.rollupJobs.createBreadcrumbTitle', {
    defaultMessage: 'Create',
  }),
};
