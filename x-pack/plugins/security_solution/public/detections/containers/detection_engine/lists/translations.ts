/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LISTS_INDEX_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.fetchListsIndex.errorDescription',
  {
    defaultMessage: 'Failed to retrieve the lists index',
  }
);

export const LISTS_INDEX_CREATE_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.createListsIndex.errorDescription',
  {
    defaultMessage: 'Failed to create the lists index',
  }
);

export const LISTS_PRIVILEGES_READ_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.readListsPrivileges.errorDescription',
  {
    defaultMessage: 'Failed to retrieve lists privileges',
  }
);
