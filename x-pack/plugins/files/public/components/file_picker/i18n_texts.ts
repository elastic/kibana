/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  title: i18n.translate('xpack.fileUpload.filePicker.title', {
    defaultMessage: 'Select a file',
  }),
  loadingFilesErrorTitle: i18n.translate('xpack.fileUpload.filePicker.error.loadingTitle', {
    defaultMessage: 'Something went wrong while loading files',
  }),
  emptyStatePrompt: i18n.translate('xpack.fileUpload.filePicker.emptyStatePrompt', {
    defaultMessage: 'No files found, upload your first file.',
  }),
  selectFileLabel: i18n.translate('xpack.fileUpload.filePicker.selectFileButtonLable', {
    defaultMessage: 'Select file',
  }),
  selectFilesLabel: (nrOfFiles: number) =>
    i18n.translate('xpack.fileUpload.filePicker.selectFilesButtonLable', {
      defaultMessage: 'Select {nrOfFiles} files',
      values: { nrOfFiles },
    }),
};
