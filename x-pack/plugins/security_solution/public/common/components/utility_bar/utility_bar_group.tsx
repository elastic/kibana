/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BarGroup, BarGroupProps } from './styles';

export interface UtilityBarGroupProps extends BarGroupProps {
  children: React.ReactNode;
}

export const UtilityBarGroup = React.memo<UtilityBarGroupProps>(({ grow, children }) => (
  <BarGroup grow={grow}>{children}</BarGroup>
));

UtilityBarGroup.displayName = 'UtilityBarGroup';
