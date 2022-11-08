/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { ProcessEventAlertCategory } from '../../../common/types/process_tree';

export const FILTER_MENU_ITEM_TEXT = (processEventAlertCategory: ProcessEventAlertCategory) =>
  i18n.translate('xpack.sessionView.filterMenuItemText', {
    values: { processEventAlertCategory },
    defaultMessage: 'View {processEventAlertCategory} alerts',
  });

export const FILTER_MENU_ITEM_DEFAULT_TEXT = (defaultFilterValue: string) =>
  i18n.translate('xpack.sessionView.defaultFilterMenuItemDefaultText', {
    values: { defaultFilterValue },
    defaultMessage: 'View {defaultFilterValue} alerts',
  });

export const SELECTED_ALERT_CATEGORY_TEXT = (selectedAlertCategory: string) =>
  i18n.translate('xpack.sessionView.selectedAlertCategoryText', {
    values: { selectedAlertCategory },
    defaultMessage: 'View: {selectedAlertCategory} alerts',
  });
