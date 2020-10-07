/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiResizableContainer } from '@elastic/eui';
import { FULL_HEIGHT } from '../RumDashboard';
import { PageLoadDistribution } from '../PageLoadDistribution';
import { PageViewsTrend } from '../PageViewsTrend';
import { useBreakPoints } from '../hooks/useBreakPoints';

export function PageLoadAndViews() {
  const { isLarge } = useBreakPoints();

  return (
    <EuiResizableContainer
      style={FULL_HEIGHT}
      direction={isLarge ? 'vertical' : 'horizontal'}
    >
      {(EuiResizablePanel, EuiResizableButton) => (
        <>
          <EuiResizablePanel initialSize={50} minSize="20%">
            <EuiPanel style={FULL_HEIGHT}>
              <PageLoadDistribution />
            </EuiPanel>
          </EuiResizablePanel>
          <EuiResizableButton />
          <EuiResizablePanel initialSize={50} minSize="20%">
            <EuiPanel style={FULL_HEIGHT}>
              <PageViewsTrend />
            </EuiPanel>
          </EuiResizablePanel>
        </>
      )}
    </EuiResizableContainer>
  );
}
