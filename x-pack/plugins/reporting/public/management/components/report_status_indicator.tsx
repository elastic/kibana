/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth } from '@elastic/eui';

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

  switch (status) {
    case JOB_STATUSES.COMPLETED:
      return <EuiHealth color="success">{i18nTexts.completed}</EuiHealth>;
    case JOB_STATUSES.WARNINGS:
      return <EuiHealth color="warning">{i18nTexts.completedWithWarnings}</EuiHealth>;
    case JOB_STATUSES.PENDING:
      return <EuiHealth color="primary">{i18nTexts.pending}</EuiHealth>;
    case JOB_STATUSES.FAILED:
      return <EuiHealth color="danger">{i18nTexts.failed}</EuiHealth>;
    default:
      return <EuiHealth color="">{i18nTexts.unknown}</EuiHealth>;
  }
};
