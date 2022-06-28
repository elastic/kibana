/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
import { MLManageJobsLink } from '../../../shared/links/machine_learning_links/mlmanage_jobs_link';

export function JobsListStatus({
  jobId,
  jobState,
  datafeedState,
  version,
}: {
  jobId: string;
  jobState?: JOB_STATE;
  datafeedState?: DATAFEED_STATE;
  version: number;
}) {
  const jobIsOk =
    jobState === JOB_STATE.OPENED || jobState === JOB_STATE.OPENING;

  const datafeedIsOk =
    datafeedState === DATAFEED_STATE.STARTED ||
    datafeedState === DATAFEED_STATE.STARTING;

  const isClosed =
    jobState === JOB_STATE.CLOSED || jobState === JOB_STATE.CLOSING;

  const isLegacy = version < 3;

  const statuses: React.ReactElement[] = [];

  if (jobIsOk && datafeedIsOk) {
    statuses.push(
      <EuiBadge color="success">
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.okStatusLabel',
          { defaultMessage: 'OK' }
        )}
      </EuiBadge>
    );
  } else if (!isClosed) {
    statuses.push(
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.warningStatusLabel',
          {
            defaultMessage:
              'Job might be experiencing problems. Click the Manage Jobs link to learn more.',
          }
        )}
      >
        <MLManageJobsLink jobId={jobId}>
          <EuiBadge color="warning">
            {i18n.translate(
              'xpack.apm.settings.anomalyDetection.jobList.warningStatusBadgeLabel',
              { defaultMessage: 'Warning' }
            )}
          </EuiBadge>
        </MLManageJobsLink>
      </EuiToolTip>
    );
  }

  if (isClosed) {
    statuses.push(
      <EuiBadge color="hollow">
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.closedStatusLabel',
          { defaultMessage: 'Closed' }
        )}
      </EuiBadge>
    );
  }

  if (isLegacy) {
    statuses.push(
      <EuiBadge color="default">
        {' '}
        {i18n.translate(
          'xpack.apm.settings.anomalyDetection.jobList.legacyStatusLabel',
          { defaultMessage: 'Legacy' }
        )}
      </EuiBadge>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {statuses.map((status, idx) => (
        <EuiFlexItem grow={false} key={idx}>
          {status}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
