/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MlSummaryJobs } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlLink } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { TimeRange } from '../../../../../../../../src/plugins/data/common';

interface Props {
  jobsList: MlSummaryJobs;
  timeRange?: TimeRange;
}

export const ExplorerLink: FC<Props> = ({ jobsList, timeRange }) => {
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.overview.anomalyDetection.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: { jobsCount: jobsList.length, jobId: jobsList[0] && jobsList[0].id },
    }
  );

  const explorerPath = useMlLink({
    page: ML_PAGES.ANOMALY_EXPLORER,
    pageState: {
      jobIds: jobsList.map((job) => job.id),
      timeRange,
    },
  });

  return explorerPath ? (
    <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
      <EuiButtonEmpty
        href={explorerPath}
        color="text"
        size="xs"
        iconType="visTable"
        aria-label={openJobsInAnomalyExplorerText}
        className="results-button"
        data-test-subj={`openOverviewJobsInAnomalyExplorer`}
      >
        {i18n.translate('xpack.ml.overview.anomalyDetection.viewResultsActionName', {
          defaultMessage: 'View results',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  ) : null;
};
