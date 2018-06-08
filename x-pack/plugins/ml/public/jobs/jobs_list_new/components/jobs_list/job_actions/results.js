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

export function ResultLinks({ job })  {
  return (
    <React.Fragment>
      <EuiLink href={getLink('timeseriesexplorer', job.id)} >
        <EuiIcon type="stats" />
      </EuiLink>
      <EuiLink href={getLink('explorer', job.id)} >
        <EuiIcon type="tableOfContents" />
      </EuiLink>
      <div className="actions-border"/>
    </React.Fragment>
  );
}

function getLink(location, jobId) {
  const url = mlJobService.jobUrls[jobId];
  return `${chrome.getBasePath()}/app/ml#/${location}/${url.url}`;
}
