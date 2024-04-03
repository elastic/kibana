/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_LIST_ITEM = i18n.translate('xpack.securitySolution.listItems.addListItem', {
  defaultMessage: 'Add list item',
});

export const SUCCESFULLY_ADDED_ITEM = i18n.translate(
  'xpack.securitySolution.listItems.successfullyAddedItem',
  {
    defaultMessage: 'Succesfully added list item',
  }
);

export const VALUE_REQUIRED = i18n.translate('xpack.securitySolution.listItems.valueRequired', {
  defaultMessage: 'Value is required',
});

export const VALUE_LABEL = i18n.translate('xpack.securitySolution.listItems.valueLabel', {
  defaultMessage: 'Value',
});

export const ADD_VALUE_LIST_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.listItems.addValueListPlaceholder',
  {
    defaultMessage: 'Add list item..',
  }
);

export const ADD_LIST_ITEM_BUTTON = i18n.translate(
  'xpack.securitySolution.listItems.addListItemButton',
  {
    defaultMessage: 'Add',
  }
);

export const ADDING_LIST_ITEM_BUTTON = i18n.translate(
  'xpack.securitySolution.listItems.addingListItemButton',
  {
    defaultMessage: 'Adding...',
  }
);

export const SUCCESFULLY_DELETED_ITEM = i18n.translate(
  'xpack.securitySolution.listItems.successfullyDeletedItem',
  {
    defaultMessage: 'Succesfully deleted list item',
  }
);

export const EDIT_TEXT_INLINE_LABEL = i18n.translate(
  'xpack.securitySolution.listItems.editTextInlineLabel',
  {
    defaultMessage: 'Edit text inline',
  }
);

export const SUCCESFULLY_UPDATED_LIST_ITEM = i18n.translate(
  'xpack.securitySolution.listItems.successfullyUpdatedListItem',
  {
    defaultMessage: 'Succesfully updated list item',
  }
);

export const COLUMN_VALUE = i18n.translate('xpack.securitySolution.listItems.columnValue', {
  defaultMessage: 'Value',
});

export const COLUMN_UPDATED_AT = i18n.translate(
  'xpack.securitySolution.listItems.columnUpdatedAt',
  {
    defaultMessage: 'Updated At',
  }
);

export const COLUMN_UPDATED_BY = i18n.translate(
  'xpack.securitySolution.listItems.columnUpdatedBy',
  {
    defaultMessage: 'Updated By',
  }
);

export const COLUMN_ACTIONS = i18n.translate('xpack.securitySolution.listItems.columnActions', {
  defaultMessage: 'Actions',
});

export const FAILED_TO_FETCH_LIST_ITEM = i18n.translate(
  'xpack.securitySolution.listItems.failedToFetchListItem',
  {
    defaultMessage:
      'Failed to load list items. You can change the search query or contact your administartor',
  }
);

export const DELETE_LIST_ITEM = i18n.translate('xpack.securitySolution.listItems.deleteListItem', {
  defaultMessage: 'Delete',
});

export const DELETE_LIST_ITEM_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.listItems.deleteListItemDescription',
  {
    defaultMessage: 'Delete list item',
  }
);

export const SUCCESFULY_UPLOAD_LIST_ITEMS = i18n.translate(
  'xpack.securitySolution.listItems.succesfullyUploadListItems',
  {
    defaultMessage: 'Succesfully uploaded list items',
  }
);

export const FAILED_TO_UPLOAD_LIST_ITEM = i18n.translate(
  'xpack.securitySolution.listItems.failedToUploadListItem',
  {
    defaultMessage: 'Failed to upload list items',
  }
);

export const FAILED_TO_UPLOAD_LIST_ITEM_TITLE = i18n.translate(
  'xpack.securitySolution.listItems.failedToUploadListItemTitle',
  {
    defaultMessage: 'Error',
  }
);

export const UPLOAD_TOOLTIP = i18n.translate('xpack.securitySolution.listItems.uploadTooltip', {
  defaultMessage: 'All items from file will be added as new items',
});

export const UPLOAD_FILE_PICKER_INITAL_PROMT_TEXT = i18n.translate(
  'xpack.securitySolution.listItems.uploadFilePickerInitialPromptText',
  {
    defaultMessage: 'Select or drag and drop a file',
  }
);

export const UPLOAD_LIST_ITEM = i18n.translate('xpack.securitySolution.listItems.uploadListItem', {
  defaultMessage: 'Upload',
});

export const INFO_TYPE = i18n.translate('xpack.securitySolution.listItems.infoType', {
  defaultMessage: 'Type:',
});

export const INFO_UPDATED_AT = i18n.translate('xpack.securitySolution.listItems.infoUpdatedAt', {
  defaultMessage: 'Updated at:',
});

export const INFO_UPDATED_BY = i18n.translate('xpack.securitySolution.listItems.infoUpdatedBy', {
  defaultMessage: 'Updated by:',
});

export const INFO_TOTAL_ITEMS = i18n.translate('xpack.securitySolution.listItems.infoTotalItems', {
  defaultMessage: 'Total items:',
});

export const getInfoTotalItems = (listType: string) =>
  i18n.translate('xpack.securitySolution.listItems.searchBar', {
    defaultMessage: 'Filter your data using KQL syntax - {listType}:*',
    values: { listType },
  });
