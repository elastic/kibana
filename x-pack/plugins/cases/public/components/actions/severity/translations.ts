/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CaseSeverity } from '../../../../common/api';
import { severities } from '../../severity/config';

const SET_SEVERITY = ({
  totalCases,
  severity,
  caseTitle,
}: {
  totalCases: number;
  severity: string;
  caseTitle?: string;
}) =>
  i18n.translate('xpack.cases.containers.markInProgressCases', {
    values: { caseTitle, totalCases, severity },
    defaultMessage:
      'Severity was set to {severity} for {totalCases, plural, =1 {"{caseTitle}"} other {{totalCases} cases}}',
  });

export const SET_SEVERITY_LOW = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  SET_SEVERITY({
    totalCases,
    caseTitle,
    severity: severities[CaseSeverity.LOW].label,
  });

export const SET_SEVERITY_MEDIUM = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  SET_SEVERITY({
    totalCases,
    caseTitle,
    severity: severities[CaseSeverity.MEDIUM].label,
  });

export const SET_SEVERITY_HIGH = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  SET_SEVERITY({
    totalCases,
    caseTitle,
    severity: severities[CaseSeverity.HIGH].label,
  });

export const SET_SEVERITY_CRITICAL = ({
  totalCases,
  caseTitle,
}: {
  totalCases: number;
  caseTitle?: string;
}) =>
  SET_SEVERITY({
    totalCases,
    caseTitle,
    severity: severities[CaseSeverity.CRITICAL].label,
  });

export const BULK_ACTION_STATUS_CLOSE = i18n.translate(
  'xpack.cases.caseTable.bulkActions.status.close',
  {
    defaultMessage: 'Close selected',
  }
);

export const BULK_ACTION_STATUS_OPEN = i18n.translate(
  'xpack.cases.caseTable.bulkActions.status.open',
  {
    defaultMessage: 'Open selected',
  }
);

export const BULK_ACTION_STATUS_IN_PROGRESS = i18n.translate(
  'xpack.cases.caseTable.bulkActions.status.inProgress',
  {
    defaultMessage: 'Mark in progress',
  }
);
