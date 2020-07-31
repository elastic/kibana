/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiProgress } from '@elastic/eui';
import React, { memo } from 'react';
import styled from 'styled-components';

import { HeaderSection } from '../../../../common/components/header_section';

interface StepPanelProps {
  children: React.ReactNode;
  loading: boolean;
  title: string;
}

const MyPanel = styled(EuiPanel)`
  position: relative;
`;

MyPanel.displayName = 'MyPanel';

const StepPanelComponent: React.FC<StepPanelProps> = ({ children, loading, title }) => (
  <MyPanel>
    {loading && <EuiProgress size="xs" color="accent" position="absolute" />}
    <HeaderSection title={title} />
    {children}
  </MyPanel>
);

export const StepPanel = memo(StepPanelComponent);
