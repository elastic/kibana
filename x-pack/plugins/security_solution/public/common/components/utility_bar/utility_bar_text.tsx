/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { BarText } from './styles';

export interface UtilityBarTextProps {
  children: string | JSX.Element;
  dataTestSubj?: string;
  shouldWrap?: boolean;
}

export const UtilityBarText = React.memo<UtilityBarTextProps>(
  ({ children, dataTestSubj, shouldWrap = false }) => (
    <BarText data-test-subj={dataTestSubj} shouldWrap={shouldWrap}>
      {children}
    </BarText>
  )
);

UtilityBarText.displayName = 'UtilityBarText';
