/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink, EuiToolTip, EuiLoadingSpinner } from '@elastic/eui';
import { IS_OPERATOR } from '../timeline/data_providers/data_provider';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { getEmptyTagValue } from '../empty_value';
import { Spacer } from '../page';
import { Provider } from '../timeline/data_providers/provider';
import { Anomalies, Anomaly } from './types';
import { getTopSeverityJobs } from './get_top_severity';
import { DraggableWrapper, DragEffects } from '../drag_and_drop/draggable_wrapper';

interface Args {
  startDate: number;
  endDate: number;
  anomalies: Anomalies | null;
  isLoading: boolean;
}

export const getScoreString = (score: number): string => {
  if (score < 1) {
    return '< 1';
  } else {
    return String(score.toFixed(0));
  }
};

export const formatToolTip = (score: Anomaly) => (
  <div>
    <div>{score.entityName}</div>
    <div>{score.entityValue}</div>
  </div>
);

export const createEntitiesFromScore = (score: Anomaly) => {
  const influencers = score.influencers.reduce((accum, item, index) => {
    if (index === 0) {
      return `${Object.keys(item)[0]}:'${Object.values(item)[0]}'`;
    } else {
      return `${accum},${Object.keys(item)[0]}:'${Object.values(item)[0]}'`;
    }
  }, '');

  if (!influencers.includes(score.entityName)) {
    return `${influencers},${score.entityName}:'${score.entityValue}'`;
  } else {
    return influencers;
  }
};

export const createLink = (score: Anomaly, startDate: number, endDate: number): string => {
  const startDateIso = new Date(startDate).toISOString();
  const endDateIso = new Date(endDate).toISOString();

  const JOB_PREFIX = `ml#/timeseriesexplorer?_g=(ml:(jobIds:!(${score.jobId}))`;
  const REFRESH_INTERVAL = `,refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))`;
  const INTERVAL_SELECTION = `&_a=(mlSelectInterval:(display:Auto,val:auto),mlSelectSeverity:(color:%23d2e9f7,display:warning,val:0),mlTimeSeriesExplorer:(detectorIndex:0,`;
  const ENTITIES = `entities:(${createEntitiesFromScore(score)})))`;

  return `${JOB_PREFIX}${REFRESH_INTERVAL}${INTERVAL_SELECTION}${ENTITIES}`;
};

export const AnomalyScores = React.memo<Args>(({ anomalies, startDate, endDate, isLoading }) => {
  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }
  if (
    anomalies == null ||
    anomalies.anomalies.length === 0 ||
    startDate == null ||
    endDate == null
  ) {
    return getEmptyTagValue();
  }
  const topScores = getTopSeverityJobs(anomalies.anomalies);
  const items = topScores.map((score, index) => {
    const id = escapeDataProviderId(`anomaly-scores-${score.jobId}`);
    return (
      <EuiToolTip key={score.jobId} title={score.jobId} content={formatToolTip(score)}>
        <EuiLink href={createLink(score, startDate, endDate)} target="_blank">
          <DraggableWrapper
            key={score.jobId}
            dataProvider={{
              and: [],
              enabled: true,
              id,
              name: score.entityName,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: score.entityName,
                value: score.entityValue,
                operator: IS_OPERATOR,
              },
            }}
            render={(dataProvider, _, snapshot) =>
              snapshot.isDragging ? (
                <DragEffects>
                  <Provider dataProvider={dataProvider} />
                </DragEffects>
              ) : (
                <>
                  {index !== 0 && (
                    <>
                      {','}
                      <Spacer />
                    </>
                  )}
                  {getScoreString(score.severity)}
                </>
              )
            }
          />
        </EuiLink>
      </EuiToolTip>
    );
  });
  return <span>{items}</span>;
});
