/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiIcon,
  EuiLink,
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { mlJobService } from 'plugins/ml/services/job_service';

export function ResultLinks({ jobs })  {
  return (
    <React.Fragment>
      {(jobs.length < 2) &&
        <EuiLink href={getLink('timeseriesexplorer', jobs)} >
          <EuiIcon type="stats" />
        </EuiLink>
      }
      <EuiLink href={getLink('explorer', jobs)} >
        <EuiIcon type="tableOfContents" />
      </EuiLink>
      <div className="actions-border"/>
    </React.Fragment>
  );
}

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
