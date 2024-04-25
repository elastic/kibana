/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_LIST_ID_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.idTitle',
  {
    defaultMessage: 'List ID',
  }
);

export const EXCEPTION_LIST_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.listName',
  {
    defaultMessage: 'Name',
  }
);

export const EXCEPTION_LIST_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.actionsTitle',
  {
    defaultMessage: 'Actions',
  }
);

export const SHOWING_EXCEPTION_LISTS = (totalLists: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.rules.all.exceptions.showingExceptionLists',
    {
      values: { totalLists },
      defaultMessage: 'Showing {totalLists} {totalLists, plural, =1 {list} other {lists}}',
    }
  );

export const RULES_ASSIGNED_TO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.rulesAssignedTitle',
  {
    defaultMessage: 'Rules assigned to',
  }
);

export const showMoreRules = (rulesCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.all.exceptions.rulesPopoverButton', {
    defaultMessage: '+{rulesCount} {rulesCount, plural, =1 {Rule} other {Rules}}',
    values: { rulesCount },
  });

export const LIST_DATE_CREATED_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.dateCreatedTitle',
  {
    defaultMessage: 'Date created',
  }
);

export const LIST_DATE_UPDATED_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.dateUpdatedTitle',
  {
    defaultMessage: 'Last edited',
  }
);

export const ERROR_EXCEPTION_LISTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.errorFetching',
  {
    defaultMessage: 'Error fetching exception lists',
  }
);

export const NO_EXCEPTION_LISTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptionLists.filters.noExceptionsTitle',
  {
    defaultMessage: 'No exception lists found',
  }
);

export const EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptionLists.search.placeholder',
  {
    defaultMessage: 'Search exception lists',
  }
);

export const ALL_EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptions.tableTitle',
  {
    defaultMessage: 'Shared Exception Lists',
  }
);

export const ALL_EXCEPTIONS_SUBTITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptions.tableSubtitle',
  {
    defaultMessage: "To view rule specific exceptions navigate to that rule's details page.",
  }
);

export const allExceptionsRowPerPage = (rowSize: number) =>
  i18n.translate('xpack.securitySolution.exceptions.allExceptionsRowPerPage', {
    defaultMessage: 'Rows per page: {rowSize}',
    values: { rowSize },
  });

export const NO_LISTS_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptions.filters.noListsBody',
  {
    defaultMessage: "We weren't able to find any exception lists.",
  }
);

export const EXCEPTION_LIST_EXPORTED_SUCCESSFULLY = (listName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.list.export_success', {
    values: { listName },
    defaultMessage: 'Exception list "{listName}" exported successfully',
  });

export const EXCEPTION_EXPORT_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.exportError',
  {
    defaultMessage: 'Exception list export error',
  }
);

export const EXCEPTION_LIST_DUPLICATED_SUCCESSFULLY = (listName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.list.duplicate_success', {
    values: { listName },
    defaultMessage: 'Exception list "{listName}" duplicated successfully',
  });

export const EXCEPTION_DUPLICATE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.duplicateError',
  {
    defaultMessage: 'Exception list duplication error',
  }
);

export const EXCEPTION_DELETE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.deleteError',
  {
    defaultMessage: 'Error occurred deleting exception list',
  }
);

export const exceptionDeleteSuccessMessage = (listId: string) =>
  i18n.translate('xpack.securitySolution.exceptions.referenceModalSuccessDescription', {
    defaultMessage: 'Exception list - {listId} - deleted successfully.',
    values: { listId },
  });

export const REFERENCE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalTitle',
  {
    defaultMessage: 'Remove exception list',
  }
);

export const defaultDeleteListMessage = (listName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.referenceModalDefaultDescription', {
    defaultMessage: 'Are you sure you wish to DELETE exception list with the name {listName}?',
    values: { listName },
  });

export const REFERENCE_MODAL_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const REFERENCE_MODAL_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalDeleteButton',
  {
    defaultMessage: 'Remove exception list',
  }
);

export const referenceErrorMessage = (referenceCount: number) =>
  i18n.translate('xpack.securitySolution.exceptions.referenceModalDescription', {
    defaultMessage:
      'This exception list is associated with ({referenceCount}) {referenceCount, plural, =1 {rule} other {rules}}. Removing this exception list will also remove its reference from the associated rules.',
    values: { referenceCount },
  });

export const EXCEPTION_LIST_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.searchPlaceholder',
  {
    defaultMessage: 'Search by name or list_id:id',
  }
);

export const REFRESH_EXCEPTIONS_TABLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.refresh',
  {
    defaultMessage: 'Refresh',
  }
);

export const UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.exceptionListsImportButton',
  {
    defaultMessage: 'Import list',
  }
);

export const uploadSuccessMessage = (fileName: string) =>
  i18n.translate('xpack.securitySolution.lists.exceptionListImportSuccess', {
    defaultMessage: 'Exception list {fileName} was imported',
    values: { fileName },
  });

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

export const IMPORT_EXCEPTION_LIST_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.manageExceptions.importExceptionList',
  {
    defaultMessage: 'Import exception list',
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

export const IMPORT_EXCEPTION_ENDPOINT_LIST_WARNING = i18n.translate(
  'xpack.securitySolution.exceptionsTable.importExceptionEndpointListWarning',
  {
    defaultMessage: 'Multiple exception lists for Endpoint Security are not allowed.',
  }
);

export const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.exceptions.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to create, edit or delete exceptions',
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

export const RULES = i18n.translate('xpack.securitySolution.exceptionsTable.rulesCountLabel', {
  defaultMessage: 'Rules',
});
export const CREATED_BY = i18n.translate('xpack.securitySolution.exceptionsTable.createdBy', {
  defaultMessage: 'Created By',
});

export const DATE_CREATED = i18n.translate('xpack.securitySolution.exceptionsTable.createdAt', {
  defaultMessage: 'Date created',
});
export const EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.exceptionsTable.exceptionsCountLabel',
  {
    defaultMessage: 'Exceptions',
  }
);

export const CREATE_SHARED_LIST_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.manageExceptions.createSharedListButton',
  {
    defaultMessage: 'Create shared list',
  }
);

export const CREATE_BUTTON_ITEM_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.manageExceptions.createItemButton',
  {
    defaultMessage: 'Create exception item',
  }
);

export const CREATE_SHARED_LIST_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListTitle',
  {
    defaultMessage: 'Create shared exception list',
  }
);

export const CREATE_SHARED_LIST_NAME_FIELD = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListFlyoutNameField',
  {
    defaultMessage: 'Shared exception list name',
  }
);

export const CREATE_SHARED_LIST_NAME_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListFlyoutNameFieldPlaceholder',
  {
    defaultMessage: 'New exception list',
  }
);

export const CREATE_SHARED_LIST_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListFlyoutDescription',
  {
    defaultMessage: 'Description (optional)',
  }
);

export const CREATE_SHARED_LIST_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListFlyoutDescriptionPlaceholder',
  {
    defaultMessage: 'New exception list description',
  }
);

export const CREATE_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListFlyoutCreateButton',
  {
    defaultMessage: 'Create shared exception list',
  }
);

export const getSuccessText = (listName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.createSharedExceptionListSuccessDescription', {
    defaultMessage: 'List with name {listName} was created!',
    values: { listName },
  });

export const SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.createSharedExceptionListSuccessTitle',
  {
    defaultMessage: 'Created list',
  }
);

export const SORT_BY = i18n.translate('xpack.securitySolution.exceptions.sortBy', {
  defaultMessage: 'Sort by:',
});

export const SORT_BY_CREATE_AT = i18n.translate(
  'xpack.securitySolution.exceptions.sortByCreateAt',
  {
    defaultMessage: 'Created At',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_EXPORT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalExportTitle',
  {
    defaultMessage: 'Export exception list?',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_DUPLICATE_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalDuplicateTitle',
  {
    defaultMessage: 'Duplicate exception list?',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_DUPLICATE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalIncludeDuplicateDescription',
  {
    defaultMessage:
      'You’re duplicating an exception list. Switch the toggle off to exclude expired exceptions.',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_EXPORT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalIncludeExportDescription',
  {
    defaultMessage:
      'You’re exporting an exception list. Switch the toggle off to exclude expired exceptions.',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_INCLUDE_SWITCH_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalIncludeSwitchLabel',
  {
    defaultMessage: 'Include expired exceptions',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_CONFIRM_DUPLICATE_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalConfirmDuplicateButton',
  {
    defaultMessage: 'Duplicate',
  }
);

export const EXPIRED_EXCEPTIONS_MODAL_CONFIRM_EXPORT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.expiredExceptionModalConfirmExportButton',
  {
    defaultMessage: 'Export',
  }
);
