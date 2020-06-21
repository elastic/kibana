/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { Anomaly } from '../types';
import { useKibana } from '../../../lib/kibana';

interface ExplorerLinkProps {
  score: Anomaly;
  startDate: number;
  endDate: number;
  linkName: React.ReactNode;
}

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  score,
  startDate,
  endDate,
  linkName,
}) => {
  const { getUrlForApp } = useKibana().services.application;
  return (
    <EuiLink
      href={`${getUrlForApp('ml', {
        path: createExplorerLink(score, startDate, endDate),
      })}`}
      target="_blank"
    >
      {linkName}
    </EuiLink>
  );
};

export const createExplorerLink = (score: Anomaly, startDate: number, endDate: number): string => {
  const startDateIso = new Date(startDate).toISOString();
  const endDateIso = new Date(endDate).toISOString();

  const JOB_PREFIX = `#/explorer?_g=(ml:(jobIds:!(${score.jobId}))`;
  const REFRESH_INTERVAL = `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))`;
  const INTERVAL_SELECTION = `&_a=(mlExplorerFilter:(),mlExplorerSwimlane:(),mlSelectLimit:(display:'10',val:10),mlShowCharts:!t)`;

  return `${JOB_PREFIX}${REFRESH_INTERVAL}${INTERVAL_SELECTION}`;
};
