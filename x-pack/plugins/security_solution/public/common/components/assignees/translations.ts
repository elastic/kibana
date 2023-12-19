/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSIGNEES_SELECTION_STATUS_MESSAGE = (total: number) =>
  i18n.translate('xpack.securitySolution.assignees.totalUsersAssigned', {
    defaultMessage: '{total, plural, one {# filter} other {# filters}} selected',
    values: { total },
  });

export const ASSIGNEES_APPLY_BUTTON = i18n.translate(
  'xpack.securitySolution.assignees.applyButtonTitle',
  {
    defaultMessage: 'Apply',
  }
);

export const ASSIGNEES_SEARCH_USERS = i18n.translate(
  'xpack.securitySolution.assignees.selectableSearchPlaceholder',
  {
    defaultMessage: 'Search users',
  }
);

export const ASSIGNEES_CLEAR_FILTERS = i18n.translate(
  'xpack.securitySolution.assignees.clearFilters',
  {
    defaultMessage: 'Clear filters',
  }
);

export const ASSIGNEES_NO_ASSIGNEES = i18n.translate(
  'xpack.securitySolution.assignees.noAssigneesLabel',
  {
    defaultMessage: 'No assignees',
  }
);
