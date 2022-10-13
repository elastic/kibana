/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';

import type { Job } from '../../lib/job';
import { JOB_STATUSES } from '../../../common/constants';
import { jobHasIssues } from '../utils';

interface Props {
  job: Job;
}

const i18nTexts = {
  completed: i18n.translate('xpack.reporting.statusIndicator.completedLabel', {
    defaultMessage: 'Done',
  }),
  completedWithWarnings: i18n.translate(
    'xpack.reporting.statusIndicator.completedWithWarningsLabel',
    {
      defaultMessage: 'Done, warnings detected',
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

export const ReportStatusIndicator: FC<Props> = ({ job }) => {
  const hasIssues = useMemo<boolean>(() => jobHasIssues(job), [job]);

  let icon: JSX.Element;
  let statusText: string;

  switch (job.status) {
    case JOB_STATUSES.COMPLETED:
      if (hasIssues) {
        icon = <EuiIcon type="alert" color="warning" />;
        statusText = i18nTexts.completedWithWarnings;
        break;
      }
      icon = <EuiIcon type="checkInCircleFilled" color="success" />;
      statusText = i18nTexts.completed;
      break;
    case JOB_STATUSES.WARNINGS:
      icon = <EuiIcon type="alert" color="warning" />;
      statusText = i18nTexts.completedWithWarnings;
      break;
    case JOB_STATUSES.PENDING:
      icon = <EuiLoadingSpinner />;
      statusText = i18nTexts.pending;
      break;
    case JOB_STATUSES.PROCESSING:
      icon = <EuiLoadingSpinner />;
      statusText = i18nTexts.processing({ attempt: job.attempts, of: job.max_attempts });
      break;
    case JOB_STATUSES.FAILED:
      icon = <EuiIcon type="crossInACircleFilled" color="danger" />;
      statusText = i18nTexts.failed;
      break;
    default:
      icon = <EuiIcon type="cross" color="subdued" />;
      statusText = i18nTexts.unknown;
  }

  return (
    <EuiToolTip content={i18nTexts.lastStatusUpdate({ date: job.getPrettyStatusTimestamp() })}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} aria-label={statusText}>
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem grow={false}>{statusText}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};
