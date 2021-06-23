/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Bar, BarProps } from './styles';

interface UtilityBarProps extends BarProps {
  children: React.ReactNode;
}

export const UtilityBar = React.memo<UtilityBarProps>(({ border, children }) => (
  <Bar border={border}>{children}</Bar>
));

UtilityBar.displayName = 'UtilityBar';
