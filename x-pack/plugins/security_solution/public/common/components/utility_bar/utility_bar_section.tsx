/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { BarSectionProps } from './styles';
import { BarSection } from './styles';

export interface UtilityBarSectionProps extends BarSectionProps {
  children: React.ReactNode;
  dataTestSubj?: string;
}

export const UtilityBarSection = React.memo<UtilityBarSectionProps>(
  ({ grow, children, dataTestSubj }) => (
    <BarSection grow={grow} data-test-subj={dataTestSubj}>
      {children}
    </BarSection>
  )
);

UtilityBarSection.displayName = 'UtilityBarSection';
