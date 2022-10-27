/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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
  'xpack.securitySolution.exceptionsTable.importExceptionListHeader',
  {
    defaultMessage: 'Import shared exception list',
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
