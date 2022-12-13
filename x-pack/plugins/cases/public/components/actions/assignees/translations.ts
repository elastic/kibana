/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export { CANCEL, UNKNOWN } from '../../../common/translations';
export { EDITED_CASES, SELECTED_CASES, SAVE_SELECTION, SEARCH_PLACEHOLDER } from '../translations';

export const EDIT_ASSIGNEES = i18n.translate('xpack.cases.actions.assignees.edit', {
  defaultMessage: 'Edit assignees',
});

export const SELECTED_ASSIGNEES = (selectedAssignees: number) =>
  i18n.translate('xpack.cases.actions.assignees.selectedAssignees', {
    defaultMessage: 'Selected: {selectedAssignees}',
    values: { selectedAssignees },
  });
