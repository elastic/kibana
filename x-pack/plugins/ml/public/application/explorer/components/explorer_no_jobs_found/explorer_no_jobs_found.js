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
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useMlLink } from '../../../contexts/kibana/use_create_url';

export const ExplorerNoJobsFound = () => {
  const ADJobsManagementUrl = useMlLink(
    {
      page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    },
    { absolute: true }
  );
  return (
    <EuiEmptyPrompt
      iconType="alert"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.explorer.noJobsFoundLabel"
            defaultMessage="No jobs found"
          />
        </h2>
      }
      actions={
        <EuiButton color="primary" href={ADJobsManagementUrl} fill>
          <FormattedMessage
            id="xpack.ml.explorer.createNewJobLinkText"
            defaultMessage="Create job"
          />
        </EuiButton>
      }
      data-test-subj="mlNoJobsFound"
    />
  );
};
