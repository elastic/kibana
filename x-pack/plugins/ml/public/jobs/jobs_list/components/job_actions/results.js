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

export function ResultLinks({ jobs })  {
  const tooltipJobs = (jobs.length === 1) ? jobs[0].id : `${jobs.length} jobs`;
  const singleMetricVisible = (jobs.length < 2);
  const singleMetricEnabled = (jobs.length === 1 && jobs[0].isSingleMetricViewerJob);
  return (
    <React.Fragment>
      {(singleMetricVisible) &&
        <EuiToolTip
          position="bottom"
          content={`Open ${tooltipJobs} in Single Metric Viewer`}
        >
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="stats"
            aria-label={`Open ${tooltipJobs} in Single Metric Viewer`}
            className="results-button"
            isDisabled={(singleMetricEnabled === false)}
          />
        </EuiToolTip>
      }
      <EuiToolTip
        position="bottom"
        content={`Open ${tooltipJobs} in Anomaly Explorer`}
      >
        <EuiButtonIcon
          href={getLink('explorer', jobs)}
          iconType="tableOfContents"
          aria-label={`Open ${tooltipJobs} in Anomaly Explorer`}
          className="results-button"
        />
      </EuiToolTip>
      <div className="actions-border"/>
    </React.Fragment>
  );
}
ResultLinks.propTypes = {
  jobs: PropTypes.array.isRequired,
};

