/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VALUE_LISTS_MODAL_ACTIVATOR = '[data-test-subj="open-value-lists-modal-button"]';
export const VALUE_LISTS_TABLE = '[data-test-subj="value-lists-table"]';
export const VALUE_LISTS_ROW = '.euiTableRow';
export const VALUE_LIST_FILE_PICKER = '[data-test-subj="value-list-file-picker"]';
export const VALUE_LIST_FILE_UPLOAD_BUTTON = '[data-test-subj="value-lists-form-import-action"]';
export const VALUE_LIST_TYPE_SELECTOR = '[data-test-subj="value-lists-form-select-type-action"]';
export const VALUE_LIST_DELETE_BUTTON = (name: string) =>
  `[data-test-subj="action-delete-value-list-${name}"]`;
export const VALUE_LIST_FILES = '[data-test-subj*="action-delete-value-list-"]';
export const VALUE_LIST_CLOSE_BUTTON = '[data-test-subj="value-lists-flyout-close-action"]';
export const VALUE_LIST_EXPORT_BUTTON = '[data-test-subj="action-export-value-list"]';
