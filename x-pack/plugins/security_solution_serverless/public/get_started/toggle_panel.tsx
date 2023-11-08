/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { useSetUpSections } from './hooks/use_setup_cards';
import type { CardId } from './types';

const TogglePanelComponent: React.FC<{ finishedCards: Set<CardId> }> = ({ finishedCards }) => {
  const { euiTheme } = useEuiTheme();

  const shadow = useEuiShadow('s');

  const { setUpSections } = useSetUpSections();
  const sectionNodes = setUpSections({ euiTheme, shadow, finishedCards });

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={1}>{sectionNodes}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TogglePanel = React.memo(TogglePanelComponent);
