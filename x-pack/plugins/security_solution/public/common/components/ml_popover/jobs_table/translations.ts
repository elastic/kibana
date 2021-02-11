/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COLUMN_JOB_NAME = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.jobNameColumn',
  {
    defaultMessage: 'Job name',
  }
);

export const COLUMN_GROUPS = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.tagsColumn',
  {
    defaultMessage: 'Groups',
  }
);

export const COLUMN_RUN_JOB = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.runJobColumn',
  {
    defaultMessage: 'Run job',
  }
);

export const NO_ITEMS_TEXT = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.noItemsDescription',
  {
    defaultMessage: 'No Security Machine Learning jobs found',
  }
);

export const CREATE_CUSTOM_JOB = i18n.translate(
  'xpack.securitySolution.components.mlPopup.jobsTable.createCustomJobButtonLabel',
  {
    defaultMessage: 'Create custom job',
  }
);
