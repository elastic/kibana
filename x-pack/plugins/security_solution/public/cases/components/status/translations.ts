/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
export * from '../../translations';

export const OPEN = i18n.translate('xpack.securitySolution.case.status.open', {
  defaultMessage: 'Open',
});

export const IN_PROGRESS = i18n.translate('xpack.securitySolution.case.status.inProgress', {
  defaultMessage: 'In progress',
});

export const CLOSED = i18n.translate('xpack.securitySolution.case.status.closed', {
  defaultMessage: 'Closed',
});

export const STATUS_ICON_ARIA = i18n.translate('xpack.securitySolution.case.status.iconAria', {
  defaultMessage: 'Change status',
});

export const CASE_OPENED = i18n.translate('xpack.securitySolution.case.caseView.caseOpened', {
  defaultMessage: 'Case opened',
});

export const CASE_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.case.caseView.caseInProgress',
  {
    defaultMessage: 'Case in progress',
  }
);

export const CASE_CLOSED = i18n.translate('xpack.securitySolution.case.caseView.caseClosed', {
  defaultMessage: 'Case closed',
});
