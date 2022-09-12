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

export const ASSIGNEES = i18n.translate('xpack.cases.userProfile.assigneesTitle', {
  defaultMessage: 'Assignees',
});

export const NO_MATCHING_USERS = i18n.translate('xpack.cases.userProfiles.noMatchingUsers', {
  defaultMessage: 'No matching users with required access.',
});

export const TRY_MODIFYING_SEARCH = i18n.translate('xpack.cases.userProfiles.tryModifyingSearch', {
  defaultMessage: 'Try modifying your search.',
});
