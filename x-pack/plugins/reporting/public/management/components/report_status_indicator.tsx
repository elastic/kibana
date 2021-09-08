/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiToolTip, IconColor } from '@elastic/eui';

import type { Job } from '../../lib/job';
import { JOB_STATUSES } from '../../../common/constants';

interface Props {
  job: Job;
}

const i18nTexts = {
  completed: i18n.translate('xpack.reporting.statusIndicator.completedLabel', {
    defaultMessage: 'Completed',
  }),
  completedWithWarnings: i18n.translate(
    'xpack.reporting.statusIndicator.completedWithWarningsLabel',
    {
      defaultMessage: 'Completed with warnings',
    }
  ),
  pending: i18n.translate('xpack.reporting.statusIndicator.pendingLabel', {
    defaultMessage: 'Pending',
  }),
  failed: i18n.translate('xpack.reporting.statusIndicator.failedLabel', {
    defaultMessage: 'Failed',
  }),
  unknown: i18n.translate('xpack.reporting.statusIndicator.unknownLabel', {
    defaultMessage: 'Unknown',
  }),
};

export const ReportStatusIndicator: FC<Props> = ({ job }) => {
  const status = job.status;

  const renderToolTip = (statusText: string, color: IconColor) => (
    <EuiHealth aria-label={statusText} color={color}>
      {statusText}
    </EuiHealth>
  );

  switch (status) {
    case JOB_STATUSES.COMPLETED:
      return renderToolTip(i18nTexts.completed, 'success');
    case JOB_STATUSES.WARNINGS:
      return renderToolTip(i18nTexts.completedWithWarnings, 'warning');
    case JOB_STATUSES.PENDING:
    case JOB_STATUSES.PROCESSING:
      return renderToolTip(i18nTexts.pending, 'primary');
    case JOB_STATUSES.FAILED:
      return renderToolTip(i18nTexts.failed, 'danger');
    default:
      return renderToolTip(i18nTexts.unknown, 'subdued');
  }
};
