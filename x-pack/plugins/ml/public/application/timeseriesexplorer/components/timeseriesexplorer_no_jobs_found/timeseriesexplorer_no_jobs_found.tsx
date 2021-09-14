/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering EuiEmptyPrompt when no jobs were found.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { useMlLocator, useNavigateToPath } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';

export const TimeseriesexplorerNoJobsFound = () => {
  const mlLocator = useMlLocator();
  const navigateToPath = useNavigateToPath();

  const redirectToJobsManagementPage = async () => {
    if (!mlLocator) return;
    const path = await mlLocator.getUrl({
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
