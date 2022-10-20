/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  defaultPickerLabel: i18n.translate('xpack.files.uploadFile.defaultFilePickerLabel', {
    defaultMessage: 'Upload a file',
  }),
  upload: i18n.translate('xpack.files.uploadFile.uploadButtonLabel', {
    defaultMessage: 'Upload',
  }),
  uploading: i18n.translate('xpack.files.uploadFile.uploadingButtonLabel', {
    defaultMessage: 'Uploading',
  }),
  uploadComplete: i18n.translate('xpack.files.uploadFile.uploadCompleteButtonLabel', {
    defaultMessage: 'Upload complete',
  }),
  retry: i18n.translate('xpack.files.uploadFile.retryButtonLabel', {
    defaultMessage: 'Retry',
  }),
  clear: i18n.translate('xpack.files.uploadFile.clearButtonLabel', {
    defaultMessage: 'Clear',
  }),
  cancel: i18n.translate('xpack.files.uploadFile.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  uploadDone: i18n.translate('xpack.files.uploadFile.uploadDoneToolTipContent', {
    defaultMessage: 'Your file was successfully uploaded!',
  }),
  fileTooLarge: (expectedSize: string) =>
    i18n.translate('xpack.files.uploadFile.fileTooLargeErrorMessage', {
      defaultMessage:
        'File is too large. Maximum size is {expectedSize, plural, one {# byte} other {# bytes} }.',
      values: { expectedSize },
    }),
};
