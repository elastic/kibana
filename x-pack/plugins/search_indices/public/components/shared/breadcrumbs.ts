/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

export const IndexManagementBreadcrumbs: ChromeBreadcrumb[] = [
  {
    text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.label', {
      defaultMessage: 'Index Management',
    }),
    href: '/app/management/data/index_management',
  },
  {
    text: i18n.translate('xpack.searchIndices.breadcrumbs.indexManagement.indices.label', {
      defaultMessage: 'Indices',
    }),
    href: '/app/management/data/index_management/indices',
  },
];
