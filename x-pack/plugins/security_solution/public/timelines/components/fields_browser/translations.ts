/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CATEGORY = i18n.translate('xpack.securitySolution.fieldBrowser.categoryLabel', {
  defaultMessage: 'Category',
});

export const CATEGORIES = i18n.translate('xpack.securitySolution.fieldBrowser.categoriesTitle', {
  defaultMessage: 'Categories',
});

export const CATEGORIES_COUNT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.categoriesCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {category} other {categories}}',
  });

export const CATEGORY_LINK = ({ category, totalCount }: { category: string; totalCount: number }) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.categoryLinkAriaLabel', {
    values: { category, totalCount },
    defaultMessage:
      '{category} {totalCount} {totalCount, plural, =1 {field} other {fields}}. Click this button to select the {category} category.',
  });

export const CATEGORY_FIELDS_TABLE_CAPTION = (categoryId: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.categoryFieldsTableCaption', {
    defaultMessage: 'category {categoryId} fields',
    values: {
      categoryId,
    },
  });

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.fieldBrowser.copyToClipboard',
  {
    defaultMessage: 'Copy to Clipboard',
  }
);

export const CLOSE = i18n.translate('xpack.securitySolution.fieldBrowser.closeButton', {
  defaultMessage: 'Close',
});

export const CUSTOMIZE_COLUMNS = i18n.translate(
  'xpack.securitySolution.fieldBrowser.customizeColumnsTitle',
  {
    defaultMessage: 'Customize Columns',
  }
);

export const DESCRIPTION = i18n.translate('xpack.securitySolution.fieldBrowser.descriptionLabel', {
  defaultMessage: 'Description',
});

export const DESCRIPTION_FOR_FIELD = (field: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.descriptionForScreenReaderOnly', {
    values: {
      field,
    },
    defaultMessage: 'Description for field {field}:',
  });

export const FIELD = i18n.translate('xpack.securitySolution.fieldBrowser.fieldLabel', {
  defaultMessage: 'Field',
});

export const FIELDS = i18n.translate('xpack.securitySolution.fieldBrowser.fieldsTitle', {
  defaultMessage: 'Columns',
});

export const FIELDS_COUNT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.fieldsCountTitle', {
    values: { totalCount },
    defaultMessage: '{totalCount} {totalCount, plural, =1 {field} other {fields}}',
  });

export const FILTER_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.fieldBrowser.filterPlaceholder',
  {
    defaultMessage: 'Field name',
  }
);

export const NO_FIELDS_MATCH = i18n.translate(
  'xpack.securitySolution.fieldBrowser.noFieldsMatchLabel',
  {
    defaultMessage: 'No fields match',
  }
);

export const NO_FIELDS_MATCH_INPUT = (searchInput: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.noFieldsMatchInputLabel', {
    defaultMessage: 'No fields match {searchInput}',
    values: {
      searchInput,
    },
  });

export const RESET_FIELDS = i18n.translate('xpack.securitySolution.fieldBrowser.resetFieldsLink', {
  defaultMessage: 'Reset Fields',
});

export const VIEW_ALL_CATEGORY_FIELDS = (categoryId: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.viewCategoryTooltip', {
    defaultMessage: 'View all {categoryId} fields',
    values: {
      categoryId,
    },
  });

export const YOU_ARE_IN_A_POPOVER = i18n.translate(
  'xpack.securitySolution.fieldBrowser.youAreInAPopoverScreenReaderOnly',
  {
    defaultMessage: 'You are in the Customize Columns popup. To exit this popup, press Escape.',
  }
);

export const VIEW_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.viewColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage: 'View {field} column',
  });
