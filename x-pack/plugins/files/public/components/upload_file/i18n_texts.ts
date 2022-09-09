/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  upload: i18n.translate('xpack.files.uploadFile.uploadButtonLabel', {
    defaultMessage: 'Upload',
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
  fileTooLarge: i18n.translate('xpack.files.uploadFile.fileTooLargeErrorMessage', {
    defaultMessage: 'File is too large',
  }),
};
