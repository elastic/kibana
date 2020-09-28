/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCreateADLinks } from '../../../../components/custom_hooks/use_create_ad_links';
import { Link } from 'react-router-dom';
import { useMlKibana } from '../../../../contexts/kibana';

export function ResultLinks({ jobs, isManagementTable }) {
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();
  const openJobsInSingleMetricViewerText = i18n.translate(
    'xpack.ml.jobsList.resultActions.openJobsInSingleMetricViewerText',
    {
      defaultMessage:
        'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Single Metric Viewer',
      values: {
        jobsCount: jobs.length,
        jobId: jobs[0].id,
      },
    }
  );
  const openJobsInAnomalyExplorerText = i18n.translate(
    'xpack.ml.jobsList.resultActions.openJobsInAnomalyExplorerText',
    {
      defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer',
      values: {
        jobsCount: jobs.length,
        jobId: jobs[0].id,
      },
    }
  );
  const singleMetricVisible = jobs.length < 2;
  const singleMetricEnabled = jobs.length === 1 && jobs[0].isSingleMetricViewerJob;
  const jobActionsDisabled = jobs.length === 1 && jobs[0].deleting === true;
  const { createLinkWithUserDefaults } = useCreateADLinks();
  const timeSeriesExplorerLink = useMemo(
    () => createLinkWithUserDefaults('timeseriesexplorer', jobs),
    [jobs]
  );
  const anomalyExplorerLink = useMemo(() => createLinkWithUserDefaults('explorer', jobs), [jobs]);

  return (
    <React.Fragment>
      {singleMetricVisible && (
        <EuiToolTip position="bottom" content={openJobsInSingleMetricViewerText}>
          {isManagementTable ? (
            <EuiButtonIcon
              href={`${basePath.get()}/app/ml/${timeSeriesExplorerLink}`}
              iconType="visLine"
              aria-label={openJobsInSingleMetricViewerText}
              className="results-button"
              isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
              data-test-subj="mlOpenJobsInSingleMetricViewerFromManagementButton"
            />
          ) : (
            <Link to={timeSeriesExplorerLink}>
              <EuiButtonIcon
                iconType="visLine"
                aria-label={openJobsInSingleMetricViewerText}
                className="results-button"
                isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
                data-test-subj="mlOpenJobsInSingleMetricViewerButton"
              />
            </Link>
          )}
        </EuiToolTip>
      )}
      <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
        {isManagementTable ? (
          <EuiButtonIcon
            href={`${basePath.get()}/app/ml/${anomalyExplorerLink}`}
            iconType="visTable"
            aria-label={openJobsInSingleMetricViewerText}
            className="results-button"
            isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
            data-test-subj="mlOpenJobsInSingleMetricViewerFromManagementButton"
          />
        ) : (
          <Link to={anomalyExplorerLink}>
            <EuiButtonIcon
              iconType="visTable"
              aria-label={openJobsInAnomalyExplorerText}
              className="results-button"
              isDisabled={jobActionsDisabled === true}
              data-test-subj="mlOpenJobsInAnomalyExplorerButton"
            />
          </Link>
        )}
      </EuiToolTip>
      <div className="actions-border" />
    </React.Fragment>
  );
}
ResultLinks.propTypes = {
  jobs: PropTypes.array.isRequired,
};
