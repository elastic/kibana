/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { useSetUpSections } from './hooks/use_setup_sections';
import type { ActiveSections } from './types';
import { useStepContext } from './context/card_context';

const TogglePanelComponent: React.FC<{
  activeSections: ActiveSections | null;
}> = ({ activeSections }) => {
  const { euiTheme } = useEuiTheme();

  const { toggleTaskCompleteStatus, onCardClicked } = useStepContext();

  const { setUpSections } = useSetUpSections({ euiTheme });
  const sectionNodes = useMemo(
    () =>
      setUpSections({
        activeSections,
        toggleTaskCompleteStatus,
        onCardClicked,
      }),
    [activeSections, onCardClicked, setUpSections, toggleTaskCompleteStatus]
  );

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={1}>{sectionNodes}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TogglePanel = React.memo(TogglePanelComponent);
