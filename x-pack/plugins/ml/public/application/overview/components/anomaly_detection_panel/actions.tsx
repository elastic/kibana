/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import type { MlSummaryJobs } from '../../../../../common/types/anomaly_detection_jobs/summary_job';
import { useCreateADLinks } from '../../../components/custom_hooks/use_create_ad_links';

interface Props {
  jobsList: MlSummaryJobs;
}

export const ExplorerLink: FC<Props> = ({ jobsList }) => {
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.overview.anomalyDetection.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: { jobsCount: jobsList.length, jobId: jobsList[0] && jobsList[0].id },
    }
  );
  const { createLinkWithUserDefaults } = useCreateADLinks();

  return (
    <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
      <EuiButtonEmpty
        href={createLinkWithUserDefaults('explorer', jobsList)}
        color="text"
        size="xs"
        iconType="visTable"
        aria-label={openJobsInAnomalyExplorerText}
        className="results-button"
        data-test-subj={`openOverviewJobsInAnomalyExplorer`}
      >
        {i18n.translate('xpack.ml.overview.anomalyDetection.viewActionName', {
          defaultMessage: 'View',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
};
