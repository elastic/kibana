/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export { CANCEL, ADD_TAG_CUSTOM_OPTION_LABEL } from '../../../common/translations';

export const EDIT_TAGS = i18n.translate('xpack.cases.actions.tags.edit', {
  defaultMessage: 'Edit tags',
});

export const SAVE_SELECTION = i18n.translate('xpack.cases.actions.tags.saveSelection', {
  defaultMessage: 'Save selection',
});

export const TOTAL_TAGS = (totalTags: number) =>
  i18n.translate('xpack.cases.actions.tags.totalTags', {
    defaultMessage: 'Total tags: {totalTags}',
    values: { totalTags },
  });

export const SELECT_ALL = i18n.translate('xpack.cases.actions.tags.selectAll', {
  defaultMessage: 'Select all',
});

export const SELECT_NONE = i18n.translate('xpack.cases.actions.tags.selectNone', {
  defaultMessage: 'Select none',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.cases.actions.tags.searchPlaceholder', {
  defaultMessage: 'Search',
});

export const EDITED_TAGS = (totalCases: number) =>
  i18n.translate('xpack.cases.containers.editedCases', {
    values: { totalCases },
    defaultMessage: 'Edited {totalCases, plural, =1 {case} other {{totalCases} cases}}',
  });

export const SELECTED_CASES = (totalCases: number) =>
  i18n.translate('xpack.cases.actions.tags.headerSubtitle', {
    values: { totalCases },
    defaultMessage: 'Selected cases: {totalCases}',
  });

export const SELECTED_TAGS = (selectedTags: number) =>
  i18n.translate('xpack.cases.actions.tags.selectedTags', {
    defaultMessage: 'Selected: {selectedTags}',
    values: { selectedTags },
  });

export const NO_TAGS_AVAILABLE = i18n.translate('xpack.cases.actions.tags.noTagsAvailable', {
  defaultMessage: 'No tags available. To add a tag, enter it in the query bar',
});

export const NO_SEARCH_MATCH = i18n.translate('xpack.cases.actions.tags.noTagsMatch', {
  defaultMessage: 'No tags match your search',
});
