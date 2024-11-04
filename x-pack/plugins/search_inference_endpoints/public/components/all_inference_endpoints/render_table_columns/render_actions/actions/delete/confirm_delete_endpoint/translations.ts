/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../../../../../../../../common/translations';

export const DELETE_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.title',
  {
    defaultMessage: 'Delete inference endpoint',
  }
);

export const CONFIRM_DELETE_WARNING = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.confirmQuestion',
  {
    defaultMessage:
      'Deleting an inference endpoint currently in use will cause failures in ingest and query attempts.',
  }
);

export const DELETE_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.deleteSingleEndpoint',
  {
    defaultMessage: 'Delete endpoint',
  }
);

export const SCANNING_USAGE_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.scanningMessage',
  {
    defaultMessage: 'Scanning for usage',
  }
);

export const NO_USAGE_FOUND_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.noUsageFound',
  {
    defaultMessage: 'No Usage Found',
  }
);

export const POTENTIAL_FAILURE_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.potentialFailure',
  {
    defaultMessage: 'Potential Failures',
  }
);

export const IGNORE_POTENTIAL_ERRORS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.ignoreErrors',
  {
    defaultMessage: 'Ignore errors and force deletion',
  }
);

export const COUNT_USAGE_LABEL = (count: number) =>
  i18n.translate('xpack.searchInferenceEndpoints.confirmDeleteEndpoint.countUsage', {
    defaultMessage: 'Found {count} {count, plural, =1 {usage} other {usages}}',
    values: { count },
  });

export const SEARCH_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.searchLabel',
  {
    defaultMessage: 'Search',
  }
);

export const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.searchARIALabel',
  {
    defaultMessage: 'Search indices and pipelines',
  }
);

export const OPEN_INDEX_MANAGEMENT = i18n.translate(
  'xpack.searchInferenceEndpoints.confirmDeleteEndpoint.openIndexManagement',
  {
    defaultMessage: 'Open Index Management',
  }
);
