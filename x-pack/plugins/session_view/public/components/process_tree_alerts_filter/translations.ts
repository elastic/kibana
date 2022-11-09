/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const FILTER_MENU_ITEM_DEFAULT_TEXT = i18n.translate(
  'xpack.sessionView.defaultFilterMenuItemDefaultText',
  {
    defaultMessage: 'View all alerts',
  }
);

export const SELECTED_ALERT_CATEGORY_TEXT = (selectedAlertCategory: string) =>
  i18n.translate('xpack.sessionView.selectedAlertCategoryText', {
    values: { selectedAlertCategory },
    defaultMessage: 'View: {selectedAlertCategory} alerts',
  });
