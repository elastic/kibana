/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/css';

import * as i18n from './translations';
import { useSetUpSections } from './hooks/use_setup_sections';

import type { ActiveSections } from './types';
import { useStepContext } from './context/step_context';
import type { ProductLine } from './configs';

const TogglePanelComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeSections: ActiveSections | null;
}> = ({ activeSections, activeProducts }) => {
  const { euiTheme } = useEuiTheme();

  const { expandedCardSteps, finishedSteps, toggleTaskCompleteStatus, onStepClicked } =
    useStepContext();

  const { setUpSections } = useSetUpSections({ euiTheme });
  const sectionNodes = setUpSections({
    activeSections,
    expandedCardSteps,
    finishedSteps,
    toggleTaskCompleteStatus,
    onStepClicked,
  });

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={1}>
        {activeProducts.size > 0 ? (
          sectionNodes
        ) : (
          <EuiEmptyPrompt
            iconType="magnifyWithExclamation"
            title={<h2>{i18n.TOGGLE_PANEL_EMPTY_TITLE}</h2>}
            body={<p>{i18n.TOGGLE_PANEL_EMPTY_DESCRIPTION}</p>}
            css={css`
              padding: ${euiTheme.base * 5}px 0;
              .euiEmptyPrompt__content {
                max-width: none;
              }
            `}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const TogglePanel = React.memo(TogglePanelComponent);
