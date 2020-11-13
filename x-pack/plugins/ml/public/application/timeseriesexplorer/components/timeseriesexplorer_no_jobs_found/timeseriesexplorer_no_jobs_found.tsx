/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering EuiEmptyPrompt when no jobs were found.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { useMlUrlGenerator, useNavigateToPath } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';

export const TimeseriesexplorerNoJobsFound = () => {
  const mlUrlGenerator = useMlUrlGenerator();
  const navigateToPath = useNavigateToPath();

  const redirectToJobsManagementPage = async () => {
    const path = await mlUrlGenerator.createUrl({
      page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    });
    await navigateToPath(path, true);
  };

  return (
    <EuiEmptyPrompt
      data-test-subj="mlNoSingleMetricJobsFound"
      iconType="alert"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.noSingleMetricJobsFoundLabel"
            defaultMessage="No single metric jobs found"
          />
        </h2>
      }
      actions={
        <EuiButton color="primary" fill onClick={redirectToJobsManagementPage}>
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.createNewSingleMetricJobLinkText"
            defaultMessage="Create new single metric job"
          />
        </EuiButton>
      }
    />
  );
};
