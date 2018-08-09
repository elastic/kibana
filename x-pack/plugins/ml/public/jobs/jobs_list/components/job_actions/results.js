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

import { mlJobService } from 'plugins/ml/services/job_service';

function getLink(location, jobs) {
  let from = 0;
  let to = 0;
  if (jobs.length === 1) {
    from = jobs[0].earliestTimeStamp.string;
    to = jobs[0].latestTimeStamp.string;
  } else {
    const froms = jobs.map(j => j.earliestTimeStamp).sort((a, b) => a.unix > b.unix);
    const tos = jobs.map(j => j.latestTimeStamp).sort((a, b) => a.unix < b.unix);
    from = froms[0].string;
    to = tos[0].string;
  }

  const jobIds = jobs.map(j => j.id);
  const url = mlJobService.createResultsUrl(jobIds, from, to, location);
  return `${chrome.getBasePath()}/app/${url}`;
}

export function ResultLinks({ jobs })  {
  const tooltipJobs = (jobs.length === 1) ? jobs[0].id : `${jobs.length} jobs`;
  return (
    <React.Fragment>
      {(jobs.length < 2) &&
        <EuiToolTip
          position="bottom"
          content={`Open ${tooltipJobs} in Single Metric Viewer`}
        >
          <EuiButtonIcon
            href={getLink('timeseriesexplorer', jobs)}
            iconType="stats"
            aria-label="View results in single metric viewer"
            className="results-button"

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
          aria-label="View results in anomaly explorer"
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

