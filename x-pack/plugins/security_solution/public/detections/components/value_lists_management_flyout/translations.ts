/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VALUE_LISTS_FLYOUT_TITLE = i18n.translate(
  'xpack.securitySolution.lists.importValueListTitle',
  {
    defaultMessage: 'Import value lists',
  }
);

export const FILE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.lists.importValueListDescription',
  {
    defaultMessage: 'Import single value lists to use while writing rule exceptions.',
  }
);

export const FILE_PICKER_PROMPT = i18n.translate(
  'xpack.securitySolution.lists.uploadValueListPrompt',
  {
    defaultMessage: 'Select or drag and drop a file',
  }
);

export const FILE_PICKER_INVALID_FILE_TYPE = (fileTypes: string): string =>
  i18n.translate('xpack.securitySolution.lists.uploadValueListExtensionValidationMessage', {
    values: { fileTypes },
    defaultMessage: 'File must be one of the following types: [{fileTypes}]',
  });

export const CLOSE_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.closeValueListsModalTitle',
  {
    defaultMessage: 'Close',
  }
);

export const CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.cancelValueListsImportTitle',
  {
    defaultMessage: 'Cancel import',
  }
);

export const UPLOAD_BUTTON = i18n.translate('xpack.securitySolution.lists.valueListsImportButton', {
  defaultMessage: 'Import list',
});

export const UPLOAD_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.lists.valueListsImportSuccessTitle',
  {
    defaultMessage: 'Value list imported',
  }
);

export const UPLOAD_ERROR = i18n.translate('xpack.securitySolution.lists.valueListsUploadError', {
  defaultMessage: 'There was an error uploading the value list.',
});

export const uploadSuccessMessage = (fileName: string) =>
  i18n.translate('xpack.securitySolution.lists.valueListsImportSuccess', {
    defaultMessage: "Value list '{fileName}' was imported",
    values: { fileName },
  });

export const EXPORT_ERROR = i18n.translate('xpack.securitySolution.lists.valueListsExportError', {
  defaultMessage: 'There was an error exporting the value list.',
});

export const COLUMN_FILE_NAME = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.fileNameColumn',
  {
    defaultMessage: 'Filename',
  }
);

export const COLUMN_TYPE = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.typeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const COLUMN_UPLOAD_DATE = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.importDateColumn',
  {
    defaultMessage: 'Import Date',
  }
);

export const COLUMN_CREATED_BY = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.createdByColumn',
  {
    defaultMessage: 'Created by',
  }
);

export const COLUMN_ACTIONS = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.actionsColumn',
  {
    defaultMessage: 'Actions',
  }
);

export const ACTION_EXPORT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.exportActionDescription',
  {
    defaultMessage: 'Export value list',
  }
);

export const ACTION_DELETE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.lists.valueListsTable.deleteActionDescription',
  {
    defaultMessage: 'Remove value list',
  }
);

export const TABLE_TITLE = i18n.translate('xpack.securitySolution.lists.valueListsTable.title', {
  defaultMessage: 'Value lists',
});

export const LIST_TYPES_RADIO_LABEL = i18n.translate(
  'xpack.securitySolution.lists.valueListsForm.listTypesRadioLabel',
  {
    defaultMessage: 'Type of value list',
  }
);

export const IP_RADIO = i18n.translate('xpack.securitySolution.lists.valueListsForm.ipRadioLabel', {
  defaultMessage: 'IP addresses',
});

export const KEYWORDS_RADIO = i18n.translate(
  'xpack.securitySolution.lists.valueListsForm.keywordsRadioLabel',
  {
    defaultMessage: 'Keywords',
  }
);

export const IP_RANGE_RADIO = i18n.translate(
  'xpack.securitySolution.lists.valueListsForm.ipRangesRadioLabel',
  {
    defaultMessage: 'IP ranges',
  }
);

export const TEXT_RADIO = i18n.translate(
  'xpack.securitySolution.lists.valueListsForm.textRadioLabel',
  {
    defaultMessage: 'Text',
  }
);

export const REFERENCE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.lists.referenceModalTitle',
  {
    defaultMessage: 'Remove value list',
  }
);

export const REFERENCE_MODAL_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.referenceModalCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const REFERENCE_MODAL_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.lists.referenceModalDeleteButton',
  {
    defaultMessage: 'Remove value list',
  }
);

export const referenceErrorMessage = (referenceCount: number) =>
  i18n.translate('xpack.securitySolution.lists.referenceModalDescription', {
    defaultMessage:
      'This value list is associated with ({referenceCount}) exception {referenceCount, plural, =1 {list} other {lists}}. Removing this list will remove all exception items that reference this value list.',
    values: { referenceCount },
  });
