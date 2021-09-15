/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, IconColor, EuiToolTip } from '@elastic/eui';

import type { Job } from '../../lib/job';
import { JOB_STATUSES } from '../../../common/constants';

interface Props {
  job: Job;
  hasIssues: boolean;
}

const i18nTexts = {
  completed: i18n.translate('xpack.reporting.statusIndicator.completedLabel', {
    defaultMessage: 'Done',
  }),
  completedWithWarnings: i18n.translate(
    'xpack.reporting.statusIndicator.completedWithWarningsLabel',
    {
      defaultMessage: 'Done, issues detected',
    }
  ),
  pending: i18n.translate('xpack.reporting.statusIndicator.pendingLabel', {
    defaultMessage: 'Pending',
  }),
  processing: ({ attempt, of }: { attempt: number; of?: number }) =>
    of !== undefined
      ? i18n.translate('xpack.reporting.statusIndicator.processingMaxAttemptsLabel', {
          defaultMessage: `Processing, attempt {attempt} of {of}`,
          values: { attempt, of },
        })
      : i18n.translate('xpack.reporting.statusIndicator.processingLabel', {
          defaultMessage: `Processing, attempt {attempt}`,
          values: { attempt },
        }),
  failed: i18n.translate('xpack.reporting.statusIndicator.failedLabel', {
    defaultMessage: 'Failed',
  }),
  unknown: i18n.translate('xpack.reporting.statusIndicator.unknownLabel', {
    defaultMessage: 'Unknown',
  }),
  lastStatusUpdate: ({ date }: { date: string }) =>
    i18n.translate('xpack.reporting.statusIndicator.lastStatusUpdateLabel', {
      defaultMessage: 'Updated at {date}',
      values: { date },
    }),
};

export const ReportStatusIndicator: FC<Props> = ({ job, hasIssues }) => {
  const renderStatus = (statusText: string, color: IconColor) => (
    <EuiHealth aria-label={statusText} color={color}>
      {job.completed_at ? (
        <EuiToolTip content={i18nTexts.lastStatusUpdate({ date: job.getPrettyStatusTimestamp() })}>
          <div>{statusText}</div>
        </EuiToolTip>
      ) : (
        statusText
      )}
    </EuiHealth>
  );

  switch (job.status) {
    case JOB_STATUSES.COMPLETED:
      if (hasIssues) {
        return renderStatus(i18nTexts.completedWithWarnings, 'warning');
      }
      return renderStatus(i18nTexts.completed, 'success');
    case JOB_STATUSES.WARNINGS:
      return renderStatus(i18nTexts.completedWithWarnings, 'warning');
    case JOB_STATUSES.PENDING:
      return renderStatus(i18nTexts.pending, 'primary');
    case JOB_STATUSES.PROCESSING:
      return renderStatus(
        i18nTexts.processing({ attempt: job.attempts, of: job.max_attempts }),
        'primary'
      );
    case JOB_STATUSES.FAILED:
      return renderStatus(i18nTexts.failed, 'danger');
    default:
      return renderStatus(i18nTexts.unknown, 'subdued');
  }
};
