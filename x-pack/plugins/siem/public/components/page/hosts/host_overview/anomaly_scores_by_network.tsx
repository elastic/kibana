/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useContext, Fragment } from 'react';
import { EuiLink, EuiToolTip, EuiLoadingSpinner } from '@elastic/eui';
import { DraggableWrapper, DragEffects } from '../../../drag_and_drop/draggable_wrapper';
import { IS_OPERATOR } from '../../../timeline/data_providers/data_provider';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { Provider } from '../../../timeline/data_providers/provider';
import { Spacer } from '../..';
import { getEmptyTagValue } from '../../../empty_value';

const Args = {};

export const getScoreString = (score: number): string => {
  if (score < 1) {
    return '< 1';
  } else {
    return String(score.toFixed(0));
  }
};

export const formatToolTip = score => {
  return (
    <div>
      <div>{score.entityName}</div>
      <div>{score.entityValue}</div>
    </div>
  );
};

export const AnomalyScoresByNetwork = React.memo<any>(
  ({ scores, startDate, endDate, ip, isLoading }) => {
    if (isLoading) {
      console.log('[ip]I am loading yo');
      return <EuiLoadingSpinner size="m" />;
    } else {
      console.log('I am done loading yo');
    }
    console.log('my scores for rendering are:', startDate, endDate);
    const startDateIso = new Date(startDate).toISOString();
    const endDateIso = new Date(endDate).toISOString();
    const items = scores.map((score, index) => {
      const id = escapeDataProviderId(`anomaly-scores-network-${score.jobId}`);
      return (
        <EuiToolTip key={score.jobId} title={score.jobId} content={formatToolTip(score)}>
          <EuiLink
            href={`ml#/timeseriesexplorer?_g=(ml:(jobIds:!(${
              score.jobId
            })),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'${startDateIso}',mode:absolute,to:'${endDateIso}'))&_a=(mlSelectInterval:(display:Auto,val:auto),mlSelectSeverity:(color:%23d2e9f7,display:warning,val:0),mlTimeSeriesExplorer:(detectorIndex:0,entities:(destination.ip:'${ip}',process.name:'',source.ip:'${ip}')))`}
            target="_blank"
          >
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
                    <Spacer />
                    {getScoreString(score.severity)}
                  </>
                )
              }
            />
          </EuiLink>
        </EuiToolTip>
      );
    });
    if (items.length > 0) {
      return <span>{items}</span>;
    } else {
      return getEmptyTagValue();
    }
  }
);
