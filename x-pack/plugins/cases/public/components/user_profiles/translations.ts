/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_ASSIGNEES_PER_CASE } from '../../../common/constants';

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

export const USER_DOES_NOT_EXIST = i18n.translate('xpack.cases.userProfiles.userDoesNotExist', {
  defaultMessage: "User doesn't exist or is unavailable",
});

export const LEARN_PRIVILEGES_GRANT_ACCESS = i18n.translate(
  'xpack.cases.userProfiles.learnPrivileges',
  {
    defaultMessage: 'Learn what privileges grant access to cases.',
  }
);

export const MODIFY_SEARCH = i18n.translate('xpack.cases.userProfiles.modifySearch', {
  defaultMessage: "Modify your search or check the user's privileges.",
});

export const INVALID_ASSIGNEES = i18n.translate('xpack.cases.create.invalidAssignees', {
  defaultMessage: 'You cannot assign more than {maxAssignees} assignees to a case.',
  values: {
    maxAssignees: MAX_ASSIGNEES_PER_CASE,
  },
});

export const MAX_SELECTED_ASSIGNEES = (limit: number) =>
  i18n.translate('xpack.cases.userProfile.maxSelectedAssignees', {
    defaultMessage:
      "You've selected the maximum number of {count, plural, one {# assignee} other {# assignees}}",
    values: { count: limit },
  });
