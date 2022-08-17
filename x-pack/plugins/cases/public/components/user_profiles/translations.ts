/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const REMOVE_ASSIGNEE = i18n.translate('xpack.cases.userProfile.removeAssigneeToolTip', {
  defaultMessage: 'Remove assignee',
});

export const REMOVE_ASSIGNEE_ARIA_LABEL = i18n.translate(
  'xpack.cases.userProfile.removeAssigneeAriaLabel',
  {
    defaultMessage: 'click to remove assignee',
  }
);

export const MISSING_PROFILE = i18n.translate('xpack.cases.userProfile.missingProfile', {
  defaultMessage: 'Unable to find user profile',
});

export const SEARCH_USERS = i18n.translate('xpack.cases.userProfile.selectableSearchPlaceholder', {
  defaultMessage: 'Search users',
});

export const EDIT_ASSIGNEES = i18n.translate('xpack.cases.userProfile.editAssignees', {
  defaultMessage: 'Edit assignees',
});

export const REMOVE_ASSIGNEES = i18n.translate(
  'xpack.cases.userProfile.suggestUsers.removeAssignees',
  {
    defaultMessage: 'Remove all assignees',
  }
);

export const TOTAL_USERS = (total: number) =>
  i18n.translate('xpack.cases.userProfile.totalUsers', {
    defaultMessage: '{total, plural, one {# user} other {# users}}',
    values: { total },
  });

export const TOTAL_USERS_ASSIGNED = (total: number) =>
  i18n.translate('xpack.cases.userProfile.totalUsersAssigned', {
    defaultMessage: '{total} assigned',
    values: { total },
  });
