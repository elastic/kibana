/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';

import chrome from 'ui/chrome';
import moment from 'moment';
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

import { mlJobService } from 'plugins/ml/services/job_service';
import { injectI18n } from '@kbn/i18n/react';

function getLink(location, jobs) {
  let from = 0;
  let to = 0;
  if (jobs.length === 1) {
    from = jobs[0].earliestTimestampMs;
    to = jobs[0].latestTimestampMs;
  } else {
    from = Math.min(...jobs.map(j => j.earliestTimestampMs));
    to = Math.max(...jobs.map(j => j.latestTimestampMs));
  }

  const fromString = moment(from).format(TIME_FORMAT);
  const toString = moment(to).format(TIME_FORMAT);

  const jobIds = jobs.map(j => j.id);
  const url = mlJobService.createResultsUrl(jobIds, fromString, toString, location);
  return `${chrome.getBasePath()}/app/${url}`;
}

function ResultLinksUI({ jobs, intl }) {
  const tooltipJobs = (jobs.length === 1) ? jobs[0].id : intl.formatMessage({
    id: 'xpack.ml.jobsList.actions.results.jobsCountLabel',
    defaultMessage: '{jobsCount} jobs' }, {
    jobsCount: jobs.length
  });
  const singleMetricVisible = (jobs.length < 2);
  const singleMetricEnabled = (jobs.length === 1 && jobs[0].isSingleMetricViewerJob);
  return (
    <React.Fragment>
      {(singleMetricVisible) &&
        <EuiToolTip
          position="bottom"
          content={intl.formatMessage({
            id: 'xpack.ml.jobsList.actions.results.openJobsInSingleMetricViewerTooltip',
            defaultMessage: 'Open {tooltipJobs} in Single Metric Viewer' }, {
            tooltipJobs
          })}
        >
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="stats"
            aria-label={intl.formatMessage({
              id: 'xpack.ml.jobsList.actions.results.openJobsInSingleMetricViewerAriaLabel',
              defaultMessage: 'Open {tooltipJobs} in Single Metric Viewer' }, {
              tooltipJobs
            })}
            className="results-button"
            isDisabled={(singleMetricEnabled === false)}
          />
        </EuiToolTip>
      }
      <EuiToolTip
        position="bottom"
        content={intl.formatMessage({
          id: 'xpack.ml.jobsList.actions.results.openJobsInAnomalyExplorerTooltip',
          defaultMessage: 'Open {tooltipJobs} in Anomaly Explorer' }, {
          tooltipJobs
        })}
      >
        <EuiButtonIcon
          href={getLink('explorer', jobs)}
          iconType="tableOfContents"
          aria-label={intl.formatMessage({
            id: 'xpack.ml.jobsList.actions.results.openJobsInAnomalyExplorerAriaLabel',
            defaultMessage: 'Open {tooltipJobs} in Anomaly Explorer' }, {
            tooltipJobs
          })}
          className="results-button"
        />
      </EuiToolTip>
      <div className="actions-border"/>
    </React.Fragment>
  );
}
ResultLinksUI.propTypes = {
  jobs: PropTypes.array.isRequired,
};

export const ResultLinks = injectI18n(ResultLinksUI);
