/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const ERROR_TITLE = i18n.translate('xpack.securitySolution.containers.case.errorTitle', {
  defaultMessage: 'Error fetching data',
});

export const ERROR_DELETING = i18n.translate(
  'xpack.securitySolution.containers.case.errorDeletingTitle',
  {
    defaultMessage: 'Error deleting data',
  }
);

export const UPDATED_CASE = (caseTitle: string) =>
  i18n.translate('xpack.securitySolution.containers.case.updatedCase', {
    values: { caseTitle },
    defaultMessage: 'Updated "{caseTitle}"',
  });

export const DELETED_CASES = (totalCases: number, caseTitle?: string) =>
  i18n.translate('xpack.securitySolution.containers.case.deletedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Deleted {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const CLOSED_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.securitySolution.containers.case.closedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Closed {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const REOPENED_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.securitySolution.containers.case.reopenedCases', {
    values: { caseTitle, totalCases },
    defaultMessage: 'Opened {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const MARK_IN_PROGRESS_CASES = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.securitySolution.containers.case.markInProgressCases', {
    values: { caseTitle, totalCases },
    defaultMessage:
      'Marked {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}} as in progress',
  });

export const SUCCESS_SEND_TO_EXTERNAL_SERVICE = (serviceName: string) =>
  i18n.translate('xpack.securitySolution.containers.case.pushToExternalService', {
    values: { serviceName },
    defaultMessage: 'Successfully sent to { serviceName }',
  });

export const ERROR_GET_FIELDS = i18n.translate(
  'xpack.securitySolution.case.configure.errorGetFields',
  {
    defaultMessage: 'Error getting fields from service',
  }
);

export const SYNC_CASE = (caseTitle: string) =>
  i18n.translate('xpack.securitySolution.containers.case.syncCase', {
    values: { caseTitle },
    defaultMessage: 'Alerts in "{caseTitle}" have been synced',
  });

export const STATUS_CHANGED_TOASTER_TEXT = i18n.translate(
  'xpack.securitySolution.case.containers.statusChangeToasterText',
  {
    defaultMessage: 'Alerts in this case have been also had their status updated',
  }
);
