/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export { CANCEL, UNKNOWN } from '../../../common/translations';
export { EDITED_CASES, SELECTED_CASES, SAVE_SELECTION } from '../translations';
export { REMOVE_ASSIGNEES } from '../../user_profiles/translations';

export const EDIT_ASSIGNEES = i18n.translate('xpack.cases.actions.assignees.edit', {
  defaultMessage: 'Edit assignees',
});

export const SELECTED_ASSIGNEES = (selectedAssignees: number) =>
  i18n.translate('xpack.cases.actions.assignees.selectedAssignees', {
    defaultMessage: 'Selected: {selectedAssignees}',
    values: { selectedAssignees },
  });

export const SEARCH_ASSIGNEES_PLACEHOLDER = i18n.translate(
  'xpack.cases.actions.assignees.searchPlaceholder',
  {
    defaultMessage: 'Find a user',
  }
);

export const NO_SELECTED_ASSIGNEES = (totalCases: number) =>
  i18n.translate('xpack.cases.actions.assignees.noSelectedAssigneesTitle', {
    values: { totalCases },
    defaultMessage:
      'The selected {totalCases, plural, =1 {case does} other {cases do}} not have any assigned users',
  });

export const NO_SELECTED_ASSIGNEES_HELP_TEXT = i18n.translate(
  'xpack.cases.actions.assignees.noSelectedAssigneesHelpText',
  {
    defaultMessage: 'Search to assign users.',
  }
);
