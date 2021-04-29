/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const NO_CASES = i18n.translate('xpack.cases.caseTable.noCases.title', {
  defaultMessage: 'No Cases',
});
export const NO_CASES_BODY = i18n.translate('xpack.cases.caseTable.noCases.body', {
  defaultMessage:
    'There are no cases to display. Please create a new case or change your filter settings above.',
});

export const ADD_NEW_CASE = i18n.translate('xpack.cases.caseTable.addNewCase', {
  defaultMessage: 'Add New Case',
});

export const SHOWING_SELECTED_CASES = (totalRules: number) =>
  i18n.translate('xpack.cases.caseTable.selectedCasesTitle', {
    values: { totalRules },
    defaultMessage: 'Selected {totalRules} {totalRules, plural, =1 {case} other {cases}}',
  });

export const SHOWING_CASES = (totalRules: number) =>
  i18n.translate('xpack.cases.caseTable.showingCasesTitle', {
    values: { totalRules },
    defaultMessage: 'Showing {totalRules} {totalRules, plural, =1 {case} other {cases}}',
  });

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.cases.caseTable.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {case} other {cases}}`,
  });

export const SEARCH_CASES = i18n.translate('xpack.cases.caseTable.searchAriaLabel', {
  defaultMessage: 'Search cases',
});

export const BULK_ACTIONS = i18n.translate('xpack.cases.caseTable.bulkActions', {
  defaultMessage: 'Bulk actions',
});

export const EXTERNAL_INCIDENT = i18n.translate('xpack.cases.caseTable.snIncident', {
  defaultMessage: 'External Incident',
});

export const INCIDENT_MANAGEMENT_SYSTEM = i18n.translate('xpack.cases.caseTable.incidentSystem', {
  defaultMessage: 'Incident Management System',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.cases.caseTable.searchPlaceholder', {
  defaultMessage: 'e.g. case name',
});

export const CLOSED = i18n.translate('xpack.cases.caseTable.closed', {
  defaultMessage: 'Closed',
});

export const DELETE = i18n.translate('xpack.cases.caseTable.delete', {
  defaultMessage: 'Delete',
});

export const REQUIRES_UPDATE = i18n.translate('xpack.cases.caseTable.requiresUpdate', {
  defaultMessage: ' requires update',
});

export const UP_TO_DATE = i18n.translate('xpack.cases.caseTable.upToDate', {
  defaultMessage: ' is up to date',
});
export const NOT_PUSHED = i18n.translate('xpack.cases.caseTable.notPushed', {
  defaultMessage: 'Not pushed',
});

export const REFRESH = i18n.translate('xpack.cases.caseTable.refreshTitle', {
  defaultMessage: 'Refresh',
});

export const SERVICENOW_LINK_ARIA = i18n.translate('xpack.cases.caseTable.serviceNowLinkAria', {
  defaultMessage: 'click to view the incident on servicenow',
});

export const STATUS = i18n.translate('xpack.cases.caseTable.status', {
  defaultMessage: 'Status',
});
