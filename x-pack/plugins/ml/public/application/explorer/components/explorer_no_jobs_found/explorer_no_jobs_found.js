/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering EuiEmptyPrompt when no jobs were found.
 */
import { Link } from 'react-router-dom';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { useMlLink } from '../../../contexts/kibana/use_create_url';

export const ExplorerNoJobsFound = () => {
  const ADJobsManagementUrl = useMlLink({
    page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    excludeBasePath: true,
  });
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
        <Link to={ADJobsManagementUrl}>
          <EuiButton color="primary" fill>
            <FormattedMessage
              id="xpack.ml.explorer.createNewJobLinkText"
              defaultMessage="Create job"
            />
          </EuiButton>
        </Link>
      }
      data-test-subj="mlNoJobsFound"
    />
  );
};
