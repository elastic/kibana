/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiToolTip, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { MlSummaryJobs } from '../../../../../common/types/anomaly_detection_jobs';
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
      <Link to={createLinkWithUserDefaults('explorer', jobsList)}>
        <EuiButtonEmpty
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
      </Link>
    </EuiToolTip>
  );
};
