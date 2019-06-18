/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useContext, Fragment } from 'react';
import { EuiLink } from '@elastic/eui';

const Args = {};

export const getScoreString = (score: number): string => {
  if (score < 1) {
    return '< 1';
  } else {
    return String(score.toFixed(0));
  }
};

export const AnomalyScores = React.memo<any>(({ scores, startDate, endDate, hostItem }) => {
  console.log('my scores for rendering are:', startDate, endDate);
  const startDateIso = new Date(startDate).toISOString();
  const endDateIso = new Date(endDate).toISOString();
  if (
    hostItem == null ||
    hostItem.host == null ||
    hostItem.host.name == null ||
    scores == null ||
    startDate == null ||
    endDate == null
  ) {
    return <></>;
  }
  const items = scores.map((score, index) => (
    <EuiLink
      key={score.jobId}
      href={`ml#/timeseriesexplorer?_g=(ml:(jobIds:!(${
        score.jobId
      })),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))&_a=(mlSelectInterval:(display:Auto,val:auto),mlSelectSeverity:(color:%23d2e9f7,display:warning,val:0),mlTimeSeriesExplorer:(detectorIndex:0,entities:(host.name:${
        hostItem.host.name[0]
      },process.name:'',host.hostname:'${hostItem.host.name}')))
    `}
      target="_blank"
    >
      {index !== 0 ? ', ' : ''}
      {getScoreString(score.severity)}
    </EuiLink>
  ));
  return <span>{items}</span>;
});
