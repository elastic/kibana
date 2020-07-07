/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EVENT_RENDERERS_TITLE = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.eventRenderersTitle',
  {
    defaultMessage: 'Event Renderers',
  }
);

export const CUSTOMIZE_EVENT_RENDERERS_TITLE = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.customizeEventRenderersTitle',
  {
    defaultMessage: 'Customize Event Renderers',
  }
);

export const CUSTOMIZE_EVENT_RENDERERS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.customizeEventRenderersDescription',
  {
    defaultMessage:
      'Event Renderers automatically convey the most relevant details in an event to reveal its story',
  }
);

export const ENABLE_ALL = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.enableAllRenderersButtonLabel',
  {
    defaultMessage: 'Enable all',
  }
);

export const DISABLE_ALL = i18n.translate(
  'xpack.securitySolution.customizeEventRenderers.disableAllRenderersButtonLabel',
  {
    defaultMessage: 'Disable all',
  }
);

export const DESCRIPTION = i18n.translate('xpack.securitySolution.fieldBrowser.descriptionLabel', {
  defaultMessage: 'Description',
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

export const TOGGLE_COLUMN_TOOLTIP = i18n.translate(
  'xpack.securitySolution.fieldBrowser.toggleColumnTooltip',
  {
    defaultMessage: 'Toggle column',
  }
);

export const VIEW_CATEGORY = (categoryId: string) =>
  i18n.translate('xpack.securitySolution.fieldBrowser.viewCategoryTooltip', {
    defaultMessage: 'View all {categoryId} fields',
    values: {
      categoryId,
    },
  });
