/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

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
    defaultMessage: 'Reopened {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const SUCCESS_SEND_TO_EXTERNAL_SERVICE = (serviceName: string) =>
  i18n.translate('xpack.securitySolution.containers.case.pushToExternalService', {
    values: { serviceName },
    defaultMessage: 'Successfully sent to { serviceName }',
  });

export const ERROR_PUSH_TO_SERVICE = i18n.translate(
  'xpack.securitySolution.case.configure.errorPushingToService',
  {
    defaultMessage: 'Error pushing to service',
  }
);
