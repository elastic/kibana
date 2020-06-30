/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const FILTER_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.components.mlPopover.jobsTable.filters.searchFilterPlaceholder',
  {
    defaultMessage: 'e.g. rare_process_linux',
  }
);

export const GROUPS = i18n.translate(
  'xpack.securitySolution.components.mlPopover.jobsTable.filters.groupsLabel',
  {
    defaultMessage: 'Groups',
  }
);

export const NO_GROUPS_AVAILABLE = i18n.translate(
  'xpack.securitySolution.components.mlPopover.jobsTable.filters.noGroupsAvailableDescription',
  {
    defaultMessage: 'No Groups available',
  }
);

export const SHOW_ELASTIC_JOBS = i18n.translate(
  'xpack.securitySolution.components.mlPopover.jobsTable.filters.showAllJobsLabel',
  {
    defaultMessage: 'Elastic jobs',
  }
);

export const SHOW_CUSTOM_JOBS = i18n.translate(
  'xpack.securitySolution.components.mlPopover.jobsTable.filters.showSiemJobsLabel',
  {
    defaultMessage: 'Custom jobs',
  }
);
