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
  getActiveCardsInitialStates,
  getActiveSectionsInitialStates,
  getFinishedStepsInitialStates,
  reducer,
} from './reducer';
import type { OnStepButtonClicked, OnStepClicked, Switch } from './types';
import { GetStartedPageActions } from './types';

export const useTogglePanel = ({ productTypes }: { productTypes: SecurityProductTypes }) => {
  const {
    getAllFinishedStepsFromStorage,
    getActiveProductsFromStorage,
    toggleActiveProductsInStorage,
    addFinishedStepToStorage,
    removeFinishedStepFromStorage,
  } = getStartedStorage;

  const finishedStepsInitialStates = useMemo(
    () => getFinishedStepsInitialStates({ finishedSteps: getAllFinishedStepsFromStorage() }),
    [getAllFinishedStepsFromStorage]
  );

  const activeSectionsInitialStates = useMemo(() => {
    const activeProductsFromStorage = getActiveSectionsInitialStates({
      activeProducts: getActiveProductsFromStorage(),
    });
    return activeProductsFromStorage.size > 0
      ? activeProductsFromStorage
      : new Set(productTypes.map(({ product_line: productLine }) => ProductLine[productLine])) ??
          new Set([ProductLine.security, ProductLine.endpoint, ProductLine.cloud]);
  }, [getActiveProductsFromStorage, productTypes]);

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
    activeSections: activeCardsInitialStates,
  });

  const onStepClicked: OnStepClicked = useCallback(
    ({ stepId, cardId, sectionId }) => {
      dispatch({
        type: GetStartedPageActions.AddFinishedStep,
        payload: { stepId, cardId, sectionId },
      });
      addFinishedStepToStorage(cardId, stepId);
    },
    [addFinishedStepToStorage]
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

  return { state, onStepClicked, onStepButtonClicked, onProductSwitchChanged };
};
