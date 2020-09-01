/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { mlJobService } from '../../../../services/job_service';
import { i18n } from '@kbn/i18n';
import { getBasePath } from '../../../../util/dependency_cache';

export function getLink(location, jobs) {
  const basePath = getBasePath();
  const resultsPageUrl = mlJobService.createResultsUrlForJobs(jobs, location);
  return `${basePath.get()}/app/ml${resultsPageUrl}`;
}

export function ResultLinks({ jobs }) {
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

  return (
    <React.Fragment>
      {singleMetricVisible && (
        <EuiToolTip position="bottom" content={openJobsInSingleMetricViewerText}>
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="visLine"
            aria-label={openJobsInSingleMetricViewerText}
            className="results-button"
            isDisabled={singleMetricEnabled === false || jobActionsDisabled === true}
            data-test-subj={`openJobsInSingleMetricViewer openJobsInSingleMetricViewer-${jobs[0].id}`}
          />
        </EuiToolTip>
      )}
      <EuiToolTip position="bottom" content={openJobsInAnomalyExplorerText}>
        <EuiButtonIcon
          href={getLink('explorer', jobs)}
          iconType="visTable"
          aria-label={openJobsInAnomalyExplorerText}
          className="results-button"
          isDisabled={jobActionsDisabled === true}
          data-test-subj={`openJobsInAnomalyExplorer openJobsInSingleAnomalyExplorer-${jobs[0].id}`}
        />
      </EuiToolTip>
      <div className="actions-border" />
    </React.Fragment>
  );
}
ResultLinks.propTypes = {
  jobs: PropTypes.array.isRequired,
};
