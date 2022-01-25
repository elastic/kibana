/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
export * from '../../common/translations';

export const ALL = i18n.translate('xpack.cases.status.all', {
  defaultMessage: 'All',
});

export const OPEN = i18n.translate('xpack.cases.status.open', {
  defaultMessage: 'Open',
});

export const IN_PROGRESS = i18n.translate('xpack.cases.status.inProgress', {
  defaultMessage: 'In progress',
});

export const CLOSED = i18n.translate('xpack.cases.status.closed', {
  defaultMessage: 'Closed',
});

export const STATUS_ICON_ARIA = i18n.translate('xpack.cases.status.iconAria', {
  defaultMessage: 'Change status',
});

export const CASE_OPENED_BY = i18n.translate('xpack.cases.caseView.caseOpenedBy', {
  defaultMessage: 'Opened by',
});

export const CASE_OPENED = i18n.translate('xpack.cases.caseView.caseOpened', {
  defaultMessage: 'Case opened',
});

export const CASE_IN_PROGRESS = i18n.translate('xpack.cases.caseView.caseInProgress', {
  defaultMessage: 'Case in progress',
});

export const CASE_CLOSED = i18n.translate('xpack.cases.caseView.caseClosed', {
  defaultMessage: 'Case closed',
});

export const BULK_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.cases.caseTable.bulkActions.closeSelectedTitle',
  {
    defaultMessage: 'Close selected',
  }
);

export const BULK_ACTION_OPEN_SELECTED = i18n.translate(
  'xpack.cases.caseTable.bulkActions.openSelectedTitle',
  {
    defaultMessage: 'Open selected',
  }
);

export const BULK_ACTION_DELETE_SELECTED = i18n.translate(
  'xpack.cases.caseTable.bulkActions.deleteSelectedTitle',
  {
    defaultMessage: 'Delete selected',
  }
);

export const BULK_ACTION_MARK_IN_PROGRESS = i18n.translate(
  'xpack.cases.caseTable.bulkActions.markInProgressTitle',
  {
    defaultMessage: 'Mark in progress',
  }
);
