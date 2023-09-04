/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { ProductLine } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';
import { getStartedStorage } from './storage';
import {
  getActiveSectionsInitialStates,
  getActiveProductsInitialStates,
  getFinishedStepsInitialStates,
  reducer,
} from './reducer';
import type { OnCardClicked, OnStepButtonClicked, OnStepClicked, Switch } from './types';
import { GetStartedPageActions } from './types';

export const useTogglePanel = ({ productTypes }: { productTypes: SecurityProductTypes }) => {
  const {
    getAllFinishedStepsFromStorage,
    getActiveProductsFromStorage,
    toggleActiveProductsInStorage,
    addFinishedStepToStorage,
    removeFinishedStepFromStorage,
    addExpandedCardStepToStorage,
    removeExpandedCardStepFromStorage,
    getAllExpandedCardStepsFromStorage,
  } = getStartedStorage;

  const finishedStepsInitialStates = useMemo(
    () => getFinishedStepsInitialStates({ finishedSteps: getAllFinishedStepsFromStorage() }),
    [getAllFinishedStepsFromStorage]
  );

  const activeProductsInitialStates = useMemo(() => {
    const activeProductsFromStorage = getActiveProductsInitialStates({
      activeProducts: getActiveProductsFromStorage(),
    });
    return activeProductsFromStorage.size > 0
      ? activeProductsFromStorage
      : new Set(productTypes.map(({ product_line: productLine }) => ProductLine[productLine])) ??
          new Set([ProductLine.security, ProductLine.endpoint, ProductLine.cloud]);
  }, [getActiveProductsFromStorage, productTypes]);

  const {
    activeSections: activeSectionsInitialStates,
    totalActiveSteps: totalActiveStepsInitialStates,
    totalStepsLeft: totalStepsLeftInitialStates,
  } = useMemo(
    () =>
      getActiveSectionsInitialStates({
        activeProducts: activeProductsInitialStates,
        finishedSteps: finishedStepsInitialStates,
      }),
    [activeProductsInitialStates, finishedStepsInitialStates]
  );

  const expandedCardsInitialStates = useMemo(
    () => getAllExpandedCardStepsFromStorage(),
    [getAllExpandedCardStepsFromStorage]
  );

  const [state, dispatch] = useReducer(reducer, {
    activeProducts: activeProductsInitialStates,
    activeSections: activeSectionsInitialStates,
    expandedCardSteps: expandedCardsInitialStates,
    finishedSteps: finishedStepsInitialStates,
    totalActiveSteps: totalActiveStepsInitialStates,
    totalStepsLeft: totalStepsLeftInitialStates,
  });

  const onStepClicked: OnStepClicked = useCallback(
    ({ stepId, cardId, sectionId, isExpanded }) => {
      dispatch({
        type: GetStartedPageActions.ToggleExpandedCardStep,
        payload: { stepId, cardId, isStepExpanded: isExpanded },
      });
      if (isExpanded) {
        dispatch({
          type: GetStartedPageActions.AddFinishedStep,
          payload: { stepId, cardId, sectionId },
        });
        addFinishedStepToStorage(cardId, stepId);
        addExpandedCardStepToStorage(cardId, stepId);
      } else {
        removeExpandedCardStepFromStorage(cardId, stepId);
      }
    },
    [addExpandedCardStepToStorage, addFinishedStepToStorage, removeExpandedCardStepFromStorage]
  );

  const onCardClicked: OnCardClicked = useCallback(
    ({ cardId, isExpanded }) => {
      dispatch({
        type: GetStartedPageActions.ToggleExpandedCardStep,
        payload: { cardId, isCardExpanded: isExpanded },
      });
      if (isExpanded) {
        addExpandedCardStepToStorage(cardId);
      } else {
        removeExpandedCardStepFromStorage(cardId);
      }
    },
    [addExpandedCardStepToStorage, removeExpandedCardStepFromStorage]
  );

  const onStepButtonClicked: OnStepButtonClicked = useCallback(
    ({ stepId, cardId, sectionId, undo }) => {
      dispatch({
        type: undo
          ? GetStartedPageActions.RemoveFinishedStep
          : GetStartedPageActions.AddFinishedStep,
        payload: { stepId, cardId, sectionId },
      });
      if (undo) {
        removeFinishedStepFromStorage(cardId, stepId);
      } else {
        addFinishedStepToStorage(cardId, stepId);
      }
    },
    [addFinishedStepToStorage, removeFinishedStepFromStorage]
  );

  const onProductSwitchChanged = useCallback(
    (section: Switch) => {
      dispatch({ type: GetStartedPageActions.ToggleProduct, payload: { section: section.id } });
      toggleActiveProductsInStorage(section.id);
    },
    [toggleActiveProductsInStorage]
  );

  return { state, onCardClicked, onStepClicked, onStepButtonClicked, onProductSwitchChanged };
};
