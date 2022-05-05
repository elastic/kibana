/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useRef } from 'react';

import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { CoreStart } from '@kbn/core/public';

import { streamFetch } from './stream_fetch';
import {
  initialState,
  cancelStream,
  resetStream,
  setIsRunning,
  streamReducer,
} from './stream_reducer';

interface AiopsAppDeps {
  notifications: CoreStart['notifications'];
}

export const AiopsApp = ({ notifications }: AiopsAppDeps) => {
  const [state, dispatch] = useReducer(streamReducer, initialState);

  const abortCtrl = useRef(new AbortController());

  const onClickHandler = async () => {
    abortCtrl.current.abort();

    if (state.isRunning) {
      dispatch(cancelStream());
      return;
    }

    dispatch(resetStream());
    dispatch(setIsRunning(true));

    abortCtrl.current = new AbortController();
    await streamFetch(dispatch, abortCtrl, notifications);

    dispatch(setIsRunning(false));
  };

  const chartData = Object.entries(state.entities)
    .map(([x, y]) => {
      return {
        x,
        y,
      };
    })
    .sort((a, b) => b.y - a.y);

  return (
    <EuiPage restrictWidth="1000px">
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.aiops.congratulationsTitle"
                  defaultMessage="Single endpoint streaming demo"
                />
              </h2>
            </EuiTitle>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiText>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton type="primary" size="s" onClick={onClickHandler}>
                    {!state.isRunning && (
                      <FormattedMessage
                        id="xpack.aiops.startbuttonText"
                        defaultMessage="Start development"
                      />
                    )}
                    {state.isRunning && (
                      <FormattedMessage
                        id="xpack.aiops.cancelbuttonText"
                        defaultMessage="Stop development"
                      />
                    )}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <p>{state.progress}</p>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiProgress value={state.progress} max={100} size="xs" />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <div style={{ height: '300px' }}>
                <Chart>
                  <Settings rotation={90} />
                  <Axis
                    id="entities"
                    position={Position.Bottom}
                    title={i18n.translate('xpack.aiops.barChart.commitsTitle', {
                      defaultMessage: 'Commits',
                    })}
                    showOverlappingTicks
                  />
                  <Axis
                    id="left2"
                    title={i18n.translate('xpack.aiops.barChart.developersTitle', {
                      defaultMessage: 'Developers',
                    })}
                    position={Position.Left}
                  />

                  <BarSeries
                    id="commits"
                    xScaleType={ScaleType.Linear}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['y']}
                    data={chartData}
                  />
                </Chart>
              </div>
            </EuiText>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
