/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const uploadSuccessMessage = (fileName: string) =>
  i18n.translate('xpack.securitySolution.lists.exceptionListImportSuccess', {
    defaultMessage: "Exception list '{fileName}' was imported",
    values: { fileName },
  });

export const CREATED_BY = i18n.translate('xpack.securitySolution.exceptionsTable.createdBy', {
  defaultMessage: 'Created By',
});

export const CREATED_AT = i18n.translate('xpack.securitySolution.exceptionsTable.createdAt', {
  defaultMessage: 'Created At',
});

export const DELETE_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.deleteExceptionList',
  {
    defaultMessage: 'Delete Exception List',
  }
);

export const EXPORT_EXCEPTION_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.exportExceptionList',
  {
    defaultMessage: 'Export Exception List',
  }
);

export const IMPORT_EXCEPTION_LIST_HEADER = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionListFlyoutHeader',
  {
    defaultMessage: 'Import shared exception list',
  }
);

export const IMPORT_EXCEPTION_LIST_BODY = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionListFlyoutBody',
  {
    defaultMessage: 'Select shared exception lists to import',
  }
);

export const IMPORT_EXCEPTION_LIST_WARNING = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionListWarning',
  {
    defaultMessage: 'We found a pre-existing list with that id',
  }
);

export const IMPORT_EXCEPTION_LIST_OVERWRITE = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionListOverwrite',
  {
    defaultMessage: 'Overwrite the existing list',
  }
);

export const IMPORT_EXCEPTION_LIST_AS_NEW_LIST = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionListAsNewList',
  {
    defaultMessage: 'Create new list',
  }
);

export const UPLOAD_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.lists.exceptionListImportSuccessTitle',
  {
    defaultMessage: 'Exception list imported',
  }
);

export const UPLOAD_ERROR = i18n.translate(
  'xpack.securitySolution.lists.exceptionListUploadError',
  {
    defaultMessage: 'There was an error uploading the exception list.',
  }
);

export const UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionListsImportButton',
  {
    defaultMessage: 'Import list',
  }
);

export const CLOSE_FLYOUT = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionListsCloseImportFlyout',
  {
    defaultMessage: 'Close',
  }
);

export const IMPORT_PROMPT = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionListsFilePickerPrompt',
  {
    defaultMessage: 'Select or drag and drop multiple files',
  }
);
