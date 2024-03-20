/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/css';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
} from '@elastic/eui';
import { useAiRulesMonitoringContext } from './ai_rules_monitoring_context';

export function AiRulesMonitoringPage(): JSX.Element {
  const { isInitialLoading, isFetching, hasConnector, connectorPrompt, result, refetch } =
    useAiRulesMonitoringContext();

  const [start, setStart] = useState('now-1d');
  const [end, setEnd] = useState('now');

  const onTimeChange = ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
    setStart(newStart);
    setEnd(newEnd);
  };

  if (isInitialLoading) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  if (!hasConnector) {
    return (
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiText>
          {`To be able to use Gen AI assisted Rule Monitoring you need to configure an Generative AI
          Connector. The connector will be shared with AI Assistant.`}
        </EuiText>
        {connectorPrompt}
      </EuiFlexGroup>
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            isLoading={isFetching}
            start={start}
            end={end}
            onTimeChange={onTimeChange}
            showUpdateButton={false}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton isLoading={isFetching} onClick={refetch} disabled={isFetching}>
            {'Analyze'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiFlexItem>
          <EuiPanel
            className={css`
              min-height: 150px;
            `}
          >
            {isFetching && (
              <EuiLoadingChart
                className={css`
                  position: relative;
                  top: 50px;
                  left: 50%;
                  transform: translateX(-50%);
                `}
                size="l"
              />
            )}
            {!isFetching && (
              <EuiText
                color="subdued"
                className={css`
                  white-space: pre-line;
                  overflow: scroll;
                `}
              >
                {`${result}`}
              </EuiText>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
