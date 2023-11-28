/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';

import * as i18n from './translations';
import { useSetUpSections } from './use_setup_cards';

import type {
  ActiveSections,
  CardId,
  StepId,
  OnStepClicked,
  OnStepButtonClicked,
  OnCardClicked,
  ExpandedCardSteps,
} from './types';
import type { ProductLine } from '../../common/product';

const TogglePanelComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeSections: ActiveSections | null;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Record<CardId, Set<StepId>>;
  onCardClicked: OnCardClicked;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
}> = ({
  finishedSteps,
  activeSections,
  activeProducts,
  expandedCardSteps,
  onCardClicked,
  onStepClicked,
  onStepButtonClicked,
}) => {
  const { euiTheme } = useEuiTheme();

  const shadow = useEuiShadow('s');

  const { setUpSections } = useSetUpSections({ euiTheme, shadow });
  const sectionNodes = setUpSections({
    activeProducts,
    activeSections,
    expandedCardSteps,
    finishedSteps,
    onCardClicked,
    onStepButtonClicked,
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
              .euiEmptyPrompt__contentInner {
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
