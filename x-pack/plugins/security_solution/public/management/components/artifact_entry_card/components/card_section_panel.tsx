/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel, EuiPanelProps } from '@elastic/eui';

export type CardSectionPanelProps = Exclude<
  EuiPanelProps,
  'hasBorder' | 'hasShadow' | 'paddingSize'
>;

export const CardSectionPanel = memo<CardSectionPanelProps>((props) => {
  return <EuiPanel {...props} hasBorder={false} hasShadow={false} paddingSize="l" />;
});
CardSectionPanel.displayName = 'CardSectionPanel';
