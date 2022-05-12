/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';

import { Chart, Settings, Axis, BarSeries, Position, ScaleType } from '@elastic/charts';

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import {
  EuiBadge,
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useStreamFetchReducer } from '../../hooks/use_stream_fetch_reducer';

import { getStatusMessage } from './get_status_message';
import { initialState, resetStream, streamReducer } from './stream_reducer';

export const SingleEndpointStreamingDemo: FC = () => {
  const { notifications } = useKibana();

  const [simulateErrors, setSimulateErrors] = useState(false);

  const { dispatch, start, cancel, data, isCancelled, isRunning } = useStreamFetchReducer(
    '/internal/aiops/example_stream',
    streamReducer,
    initialState,
    { simulateErrors }
  );

  const { errors, progress, entities } = data;

  const onClickHandler = async () => {
    if (isRunning) {
      cancel();
    } else {
      dispatch(resetStream());
      start();
    }
  };

  useEffect(() => {
    if (errors.length > 0) {
      notifications.toasts.danger({ body: errors[errors.length - 1] });
    }
  }, [errors, notifications.toasts]);

  const buttonLabel = isRunning
    ? i18n.translate('xpack.aiops.stopbuttonText', {
        defaultMessage: 'Stop development',
      })
    : i18n.translate('xpack.aiops.startbuttonText', {
        defaultMessage: 'Start development',
      });

  return (
    <EuiText>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton type="primary" size="s" onClick={onClickHandler} aria-label={buttonLabel}>
            {buttonLabel}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <EuiBadge>{progress}%</EuiBadge>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiProgress value={progress} max={100} size="xs" />
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
            data={Object.entries(entities)
              .map(([x, y]) => {
                return {
                  x,
                  y,
                };
              })
              .sort((a, b) => b.y - a.y)}
          />
        </Chart>
      </div>
      <p>{getStatusMessage(isRunning, isCancelled, data.progress)}</p>
      <EuiCheckbox
        id="aiopSimulateErrorsCheckbox"
        label={i18n.translate('xpack.aiops.explainLogRateSpikes.simulateErrorsCheckboxLabel', {
          defaultMessage:
            'Simulate errors (gets applied to new streams only, not currently running ones).',
        })}
        checked={simulateErrors}
        onChange={(e) => setSimulateErrors(!simulateErrors)}
        compressed
      />
    </EuiText>
  );
};
