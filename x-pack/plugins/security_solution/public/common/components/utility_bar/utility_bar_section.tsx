/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarSection, BarSectionProps } from './styles';

export interface UtilityBarSectionProps extends BarSectionProps {
  children: React.ReactNode;
}

export const UtilityBarSection = React.memo<UtilityBarSectionProps>(({ grow, children }) => (
  <BarSection grow={grow}>{children}</BarSection>
));

UtilityBarSection.displayName = 'UtilityBarSection';
