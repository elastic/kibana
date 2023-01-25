/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiLoadingSpinner, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { manualTestRunSelector } from '../../../../state/manual_test_runs';

export const MetricItemIcon = ({ configId }: { configId: string }) => {
  const testNowRun = useSelector(manualTestRunSelector(configId));

  const inProgress = testNowRun?.status === 'in-progress' || testNowRun?.status === 'loading';

  if (inProgress) {
    return (
      <EuiToolTip position="top" content="Test is in progress">
        <EuiLoadingSpinner />
      </EuiToolTip>
    );
  }

  return (
    <StyledIcon>
      <EuiButtonIcon iconType="alert" onClick={() => {}} color="danger" />
    </StyledIcon>
  );
};

const StyledIcon = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  gap: 10px;

  width: 32px;
  height: 32px;

  background: #ffffff;
  border: 1px solid #d3dae6;

  box-shadow: 0px 0.7px 1.4px rgba(0, 0, 0, 0.07), 0px 1.9px 4px rgba(0, 0, 0, 0.05),
    0px 4.5px 10px rgba(0, 0, 0, 0.05);
  border-radius: 16px;

  flex: none;
  order: 0;
  flex-grow: 0;
`;
