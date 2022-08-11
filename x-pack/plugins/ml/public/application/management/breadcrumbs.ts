/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { JOBS_LIST_PATH } from './management_urls';

export function getJobsListBreadcrumbs() {
  return [
    {
      text: i18n.translate('xpack.ml.management.breadcrumb', {
        defaultMessage: 'Machine Learning',
      }),
      href: `#${JOBS_LIST_PATH}`,
    },
  ];
}
