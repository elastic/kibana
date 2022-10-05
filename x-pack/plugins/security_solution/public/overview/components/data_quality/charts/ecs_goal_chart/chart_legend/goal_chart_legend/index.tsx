/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

const LegendText = styled.div<{
  $textAlign: 'left' | 'center' | 'right';
}>`
  font-style: italic;
  text-align: ${({ $textAlign }) => `${$textAlign}`};
`;

const NotEcsCompliantLegendContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
`;

interface Props {
  children: React.ReactNode;
  textAlign: 'left' | 'center' | 'right';
}

const GoalChartLegendComponent: React.FC<Props> = ({ children, textAlign }) => {
  return (
    <NotEcsCompliantLegendContainer>
      <EuiFlexGroup alignItems="flexEnd" direction="column" gutterSize="none">
        <EuiFlexItem grow={1} />
        <EuiFlexItem grow={false}>
          <LegendText $textAlign={textAlign}>
            <EuiText color="subdued" size="xs">
              {children}
            </EuiText>
          </LegendText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </NotEcsCompliantLegendContainer>
  );
};

GoalChartLegendComponent.displayName = 'GoalChartLegendComponent';

export const GoalChartLegend = React.memo(GoalChartLegendComponent);
