/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useReducer } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';

import { Switch, GetStartedPageActions, StepId, CardId, SectionId } from './types';
import * as i18n from './translations';
import { ProductSwitch } from './product_switch';
import { useSetUpCardSections } from './use_setup_cards';
import { getStartedStorage } from '../../lib/get_started/storage';
import {
  getActiveCardsInitialStates,
  getActiveSectionsInitialStates,
  getFinishedStepsInitialStates,
  reducer,
} from './reducer';

const TogglePanelComponent = () => {
  const { euiTheme } = useEuiTheme();

  const shadow = useEuiShadow('s');
  const {
    getAllFinishedStepsFromStorage,
    getActiveProductsFromStorage,
    toggleActiveProductsInStorage,
    addFinishedStepToStorage,
  } = getStartedStorage;
  const finishedStepsInitialStates = useMemo(
    () => getFinishedStepsInitialStates({ finishedSteps: getAllFinishedStepsFromStorage() }),
    [getAllFinishedStepsFromStorage]
  );

  const activeSectionsInitialStates = useMemo(
    () => getActiveSectionsInitialStates({ activeProducts: getActiveProductsFromStorage() }),
    [getActiveProductsFromStorage]
  );

  const activeCardsInitialStates = useMemo(
    () =>
      getActiveCardsInitialStates({
        activeProducts: activeSectionsInitialStates,
        finishedSteps: finishedStepsInitialStates,
      }),
    [activeSectionsInitialStates, finishedStepsInitialStates]
  );

  const [state, dispatch] = useReducer(reducer, {
    activeProducts: activeSectionsInitialStates,
    finishedSteps: finishedStepsInitialStates,
    activeCards: activeCardsInitialStates,
  });
  const { setUpSections } = useSetUpCardSections({ euiTheme, shadow });
  const onStepClicked = useCallback(
    ({ stepId, cardId, sectionId }: { stepId: StepId; cardId: CardId; sectionId: SectionId }) => {
      dispatch({
        type: GetStartedPageActions.AddFinishedStep,
        payload: { stepId, cardId, sectionId },
      });
      addFinishedStepToStorage(cardId, stepId);
    },
    [addFinishedStepToStorage]
  );
  const sectionNodes = setUpSections({
    onStepClicked,
    finishedSteps: state.finishedSteps,
    activeCards: state.activeCards,
  });
  const onProductSwitchChanged = useCallback(
    (section: Switch) => {
      dispatch({ type: GetStartedPageActions.ToggleProduct, payload: { section: section.id } });
      toggleActiveProductsInStorage(section.id);
    },
    [toggleActiveProductsInStorage]
  );

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={false}>
        <ProductSwitch
          onProductSwitchChanged={onProductSwitchChanged}
          activeProducts={state.activeProducts}
          euiTheme={euiTheme}
          shadow={shadow}
        />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.base * 2.25}px;
        `}
        grow={1}
      >
        {state.activeProducts.size > 0 ? (
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
