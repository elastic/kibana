/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_FILE = i18n.translate('xpack.cases.caseView.addFile', {
  defaultMessage: 'Add file',
});

export const FAILED_UPLOAD = i18n.translate('xpack.cases.caseView.failedUpload', {
  defaultMessage: 'Failed to upload file file',
});

export const SUCCESSFUL_UPLOAD = i18n.translate('xpack.cases.caseView.successfulUpload', {
  defaultMessage: 'File uploaded successfuly!',
});

export const SUCCESSFUL_UPLOAD_FILE_NAME = (fileName: string) =>
  i18n.translate('xpack.cases.caseView.successfulUpload', {
    defaultMessage: `File ${fileName} uploaded successfully`,
  });
