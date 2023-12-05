/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { useNavigateTo } from '@kbn/security-solution-navigation';
import { ProductLine } from '../../../common/product';
import type { SecurityProductTypes } from '../../../common/config';
import { getStartedStorage } from '../storage';
import {
  getActiveSectionsInitialStates,
  getActiveProductsInitialStates,
  getFinishedStepsInitialStates,
  reducer,
} from '../reducer';
import type {
  Card,
  ExpandedCardSteps,
  ToggleTaskCompleteStatus,
  OnStepClicked,
  Step,
  Switch,
} from '../types';
import { GetStartedPageActions } from '../types';
import { findCardByStepId } from '../helpers';

const syncExpandedCardStepsToStorageFromURL = (maybeStepId: string) => {
  const { matchedCard, matchedStep } = findCardByStepId(maybeStepId);
  const hasStepContent = matchedStep && matchedStep.description;

  if (matchedCard && matchedStep && hasStepContent) {
    getStartedStorage.resetAllExpandedCardStepsToStorage();
    getStartedStorage.addExpandedCardStepToStorage(matchedCard.id, matchedStep.id);
  }
};

const syncExpandedCardStepsFromStorageToURL = (
  expandedCardSteps: ExpandedCardSteps,
  callback: ({
    matchedCard,
    matchedStep,
  }: {
    matchedCard: Card | null;
    matchedStep: Step | null;
  }) => void
) => {
  const expandedCardStep = Object.values(expandedCardSteps).find(
    (expandedCard) => expandedCard.expandedSteps.length > 0
  );

  if (expandedCardStep?.expandedSteps[0]) {
    const { matchedCard, matchedStep } = findCardByStepId(expandedCardStep?.expandedSteps[0]);

    callback?.({ matchedCard, matchedStep });
  }
};

export const useTogglePanel = ({ productTypes }: { productTypes: SecurityProductTypes }) => {
  const { navigateTo } = useNavigateTo();

  const { hash: detailName } = useLocation();
  const stepIdFromHash = detailName.split('#')[1];

  const {
    getAllFinishedStepsFromStorage,
    getActiveProductsFromStorage,
    toggleActiveProductsInStorage,
    addExpandedCardStepToStorage,
    addFinishedStepToStorage,
    removeFinishedStepFromStorage,
    removeExpandedCardStepFromStorage,
    resetAllExpandedCardStepsToStorage,
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

  const expandedCardsInitialStates: ExpandedCardSteps = useMemo(() => {
    if (stepIdFromHash) {
      syncExpandedCardStepsToStorageFromURL(stepIdFromHash);
    }

    return getAllExpandedCardStepsFromStorage();
  }, [getAllExpandedCardStepsFromStorage, stepIdFromHash]);

  useEffect(() => {
    syncExpandedCardStepsFromStorageToURL(
      expandedCardsInitialStates,
      ({ matchedStep }: { matchedStep: Step | null }) => {
        if (!matchedStep) return;
        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: `#${matchedStep.id}`,
        });
      }
    );
  }, [expandedCardsInitialStates, getAllExpandedCardStepsFromStorage, navigateTo]);

  const [state, dispatch] = useReducer(reducer, {
    activeProducts: activeProductsInitialStates,
    activeSections: activeSectionsInitialStates,
    expandedCardSteps: expandedCardsInitialStates,
    finishedSteps: finishedStepsInitialStates,
    totalActiveSteps: totalActiveStepsInitialStates,
    totalStepsLeft: totalStepsLeftInitialStates,
  });

  const onStepClicked: OnStepClicked = useCallback(
    ({ stepId, cardId, isExpanded }) => {
      dispatch({
        type: GetStartedPageActions.ToggleExpandedStep,
        payload: { stepId, cardId, isStepExpanded: isExpanded },
      });
      if (isExpanded) {
        // It allows Only One step open at a time
        resetAllExpandedCardStepsToStorage();
        addExpandedCardStepToStorage(cardId, stepId);
      } else {
        removeExpandedCardStepFromStorage(cardId, stepId);
      }
    },
    [
      addExpandedCardStepToStorage,
      removeExpandedCardStepFromStorage,
      resetAllExpandedCardStepsToStorage,
    ]
  );

  const toggleTaskCompleteStatus: ToggleTaskCompleteStatus = useCallback(
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

  return { state, onStepClicked, toggleTaskCompleteStatus, onProductSwitchChanged };
};
