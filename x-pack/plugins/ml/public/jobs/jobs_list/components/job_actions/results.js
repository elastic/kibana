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
  const openJobsInSingleMetricViewerText = intl.formatMessage({
    id: 'xpack.ml.jobsList.resultActions.openJobsInSingleMetricViewerText',
    defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Single Metric Viewer' }, {
    jobsCount: jobs.length,
    jobId: jobs[0].id
  });
  const openJobsInAnomalyExplorerText = intl.formatMessage({
    id: 'xpack.ml.jobsList.resultActions.openJobsInAnomalyExplorerText',
    defaultMessage: 'Open {jobsCount, plural, one {{jobId}} other {# jobs}} in Anomaly Explorer' }, {
    jobsCount: jobs.length,
    jobId: jobs[0].id
  });
  const singleMetricVisible = (jobs.length < 2);
  const singleMetricEnabled = (jobs.length === 1 && jobs[0].isSingleMetricViewerJob);
  const jobActionsDisabled = (jobs.length === 1 && jobs[0].deleting === true);
  return (
    <React.Fragment>
      {(singleMetricVisible) &&
        <EuiToolTip
          position="bottom"
          content={openJobsInSingleMetricViewerText}
        >
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="stats"
            aria-label={openJobsInSingleMetricViewerText}
            className="results-button"
            isDisabled={(singleMetricEnabled === false || jobActionsDisabled === true)}
          />
        </EuiToolTip>
      }
      <EuiToolTip
        position="bottom"
        content={openJobsInAnomalyExplorerText}
      >
        <EuiButtonIcon
          href={getLink('explorer', jobs)}
          iconType="tableOfContents"
          aria-label={openJobsInAnomalyExplorerText}
          className="results-button"
          isDisabled={(jobActionsDisabled === true)}
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
