/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  title: i18n.translate('xpack.files.filePicker.title', {
    defaultMessage: 'Select a file',
  }),
  loadingFilesErrorTitle: i18n.translate('xpack.files.filePicker.error.loadingTitle', {
    defaultMessage: 'Could not load files',
  }),
  retryButtonLabel: i18n.translate('xpack.files.filePicker.error.retryButtonLabel', {
    defaultMessage: 'Retry',
  }),
  emptyStatePrompt: i18n.translate('xpack.files.filePicker.emptyStatePrompt', {
    defaultMessage: 'No files found',
  }),
  emptyStatePromptSubtitle: i18n.translate('xpack.files.filePicker.emptyStatePromptSubtitle', {
    defaultMessage: 'Upload your first file.',
  }),
  selectFileLabel: i18n.translate('xpack.files.filePicker.selectFileButtonLable', {
    defaultMessage: 'Select file',
  }),
  selectFilesLabel: (nrOfFiles: number) =>
    i18n.translate('xpack.files.filePicker.selectFilesButtonLable', {
      defaultMessage: 'Select {nrOfFiles} files',
      values: { nrOfFiles },
    }),
  searchFieldPlaceholder: i18n.translate('xpack.files.filePicker.searchFieldPlaceholder', {
    defaultMessage: 'my-file-*',
  }),
  searchFieldLabel: i18n.translate('xpack.files.filePicker.searchFieldLabel', {
    defaultMessage: 'Search for a file by name',
  }),
  emptyFileGridPrompt: i18n.translate('xpack.files.filePicker.emptyGridPrompt', {
    defaultMessage: 'No files matched filter',
  }),
  loadMoreButtonLabel: i18n.translate('xpack.files.filePicker.loadMoreButtonLabel', {
    defaultMessage: 'Load more',
  }),
  clearFilterButton: i18n.translate('xpack.files.filePicker.clearFilterButtonLabel', {
    defaultMessage: 'Clear filter',
  }),
};
