/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useReducer } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiShadow, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';

import {
  Switch,
  TogglePanelAction,
  ProductId,
  TogglePanelReducer,
  ToggleStepAction,
  GetStartedPageActions,
  StepId,
  CardId,
} from './types';
import * as i18n from './translations';
import { ProductSwitch } from './product_switch';
import { useSetUpCardSections } from './use_setup_cards';
import { useStorage } from './use_storage';
import { useKibana } from '../../services';

const reducer = (state: TogglePanelReducer, action: TogglePanelAction | ToggleStepAction) => {
  if (action.type === GetStartedPageActions.ToggleSection) {
    if (state.activeSections.has(action.payload?.section)) {
      state.activeSections.delete(action.payload?.section);
    } else {
      state.activeSections.add(action.payload?.section);
    }

    return {
      ...state,
      activeSections: new Set([...state.activeSections]),
    };
  }

  if (action.type === GetStartedPageActions.AddFinishedStep) {
    if (!state.finishedSteps[action.payload.cardId]) {
      state.finishedSteps[action.payload.cardId] = new Set();
    }
    state.finishedSteps[action.payload.cardId].add(action.payload.stepId);
    return {
      ...state,
      finishedSteps: {
        ...state.finishedSteps,
        [action.payload.cardId]: new Set([...state.finishedSteps[action.payload.cardId]]),
      },
    };
  }
  return state;
};

const TogglePanelComponent = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { storage },
  } = useKibana();
  const shadow = useEuiShadow('s');
  const {
    getAllFinishedStepsFromStorage,
    getActiveProductsFromStorage,
    toggleActiveProductsInStorage,
    addFinishedStepToStorage,
  } = useStorage(storage);
  const finishedStepsInitialStates = useMemo(() => {
    const finishedSteps = getAllFinishedStepsFromStorage();
    return Object.entries(finishedSteps).reduce((acc, [key, value]) => {
      if (value) {
        acc[key] = new Set([...Object.keys(value)]);
      }
      return acc;
    }, {} as Record<string, Set<string>>);
  }, [getAllFinishedStepsFromStorage]);

  const activeSectionsInitialStates = useMemo(() => {
    const activeProducts = getActiveProductsFromStorage();
    const activeProductIds = [ProductId.analytics, ProductId.cloud, ProductId.endpoint];
    return activeProductIds.reduce((acc, key) => {
      if (activeProducts[key]) {
        acc.add(key);
      }
      return acc;
    }, new Set<ProductId>());
  }, [getActiveProductsFromStorage]);

  const [state, dispatch] = useReducer(reducer, {
    activeSections: activeSectionsInitialStates,
    finishedSteps: finishedStepsInitialStates as Record<CardId, Set<StepId>>,
  });
  const { setUpSections } = useSetUpCardSections({ euiTheme, shadow });
  const onStepClicked = useCallback(
    ({ stepId, cardId }: { stepId: StepId; cardId: CardId }) => {
      dispatch({ type: GetStartedPageActions.AddFinishedStep, payload: { stepId, cardId } });
      addFinishedStepToStorage(cardId, stepId);
    },
    [addFinishedStepToStorage]
  );
  const sectionNodes = setUpSections(state.activeSections, onStepClicked, state.finishedSteps);
  const onProductSwitchChanged = useCallback(
    (section: Switch) => {
      dispatch({ type: GetStartedPageActions.ToggleSection, payload: { section: section.id } });
      toggleActiveProductsInStorage(section.id);
    },
    [toggleActiveProductsInStorage]
  );

  return (
    <EuiFlexGroup gutterSize="none" direction="column">
      <EuiFlexItem grow={false}>
        <ProductSwitch
          onProductSwitchChanged={onProductSwitchChanged}
          activeSections={state.activeSections}
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
        {state.activeSections.size > 0 ? (
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
