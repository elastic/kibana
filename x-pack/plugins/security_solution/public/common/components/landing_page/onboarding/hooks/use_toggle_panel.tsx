/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigateTo } from '@kbn/security-solution-navigation';

import { SecurityPageName } from '../../../../../../common';

import { OnboardingStorage } from '../storage';
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
  StepId,
} from '../types';
import { OnboardingActions } from '../types';
import { findCardSectionByStepId } from '../helpers';
import type { SecurityProductTypes } from '../configs';
import { ALL_PRODUCT_LINES, ProductLine } from '../configs';
import { useSpaceId } from '../../../../hooks/use_space_id';

const syncExpandedCardStepsToStorageFromURL = (
  onboardingStorage: OnboardingStorage,
  maybeStepId: string
) => {
  const { matchedCard, matchedStep } = findCardSectionByStepId(maybeStepId);
  const hasStepContent = matchedStep && matchedStep.description;

  if (matchedCard && matchedStep && hasStepContent) {
    onboardingStorage.resetAllExpandedCardStepsToStorage();
    onboardingStorage.addExpandedCardStepToStorage(matchedCard.id, matchedStep.id);
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
    const { matchedCard, matchedStep } = findCardSectionByStepId(
      expandedCardStep?.expandedSteps[0]
    );

    callback?.({ matchedCard, matchedStep });
  }
};

export const useTogglePanel = ({
  productTypes,
  onboardingSteps,
}: {
  productTypes?: SecurityProductTypes;
  onboardingSteps: StepId[];
}) => {
  const { navigateTo } = useNavigateTo();

  const { hash: detailName } = useLocation();
  const stepIdFromHash = detailName.split('#')[1];
  const spaceId = useSpaceId();

  const onboardingStorage = useMemo(() => new OnboardingStorage(spaceId), [spaceId]);
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
  } = onboardingStorage;

  const finishedStepsInitialStates = useMemo(
    () =>
      getFinishedStepsInitialStates({
        finishedSteps: getAllFinishedStepsFromStorage(),
      }),
    [getAllFinishedStepsFromStorage]
  );

  const activeProductsInitialStates = useMemo(() => {
    const activeProductsFromStorage = getActiveProductsInitialStates({
      activeProducts: getActiveProductsFromStorage(),
    });
    return activeProductsFromStorage.size > 0
      ? activeProductsFromStorage
      : productTypes && productTypes.length > 0
      ? new Set(productTypes.map(({ product_line: productLine }) => ProductLine[productLine]))
      : new Set(ALL_PRODUCT_LINES);
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
        onboardingSteps,
      }),
    [activeProductsInitialStates, finishedStepsInitialStates, onboardingSteps]
  );

  const expandedCardsInitialStates: ExpandedCardSteps = useMemo(() => {
    if (stepIdFromHash) {
      syncExpandedCardStepsToStorageFromURL(onboardingStorage, stepIdFromHash);
    }

    return getAllExpandedCardStepsFromStorage();
  }, [onboardingStorage, getAllExpandedCardStepsFromStorage, stepIdFromHash]);

  const onStepClicked: OnStepClicked = useCallback(
    ({ stepId, cardId, isExpanded }) => {
      dispatch({
        type: OnboardingActions.ToggleExpandedStep,
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

  const [state, dispatch] = useReducer(reducer, {
    activeProducts: activeProductsInitialStates,
    activeSections: activeSectionsInitialStates,
    expandedCardSteps: expandedCardsInitialStates,
    finishedSteps: finishedStepsInitialStates,
    totalActiveSteps: totalActiveStepsInitialStates,
    totalStepsLeft: totalStepsLeftInitialStates,
    onboardingSteps,
  });

  const toggleTaskCompleteStatus: ToggleTaskCompleteStatus = useCallback(
    ({ stepId, cardId, sectionId, undo }) => {
      dispatch({
        type: undo ? OnboardingActions.RemoveFinishedStep : OnboardingActions.AddFinishedStep,
        payload: { stepId, cardId, sectionId },
      });
      if (undo) {
        removeFinishedStepFromStorage(cardId, stepId, state.onboardingSteps);
      } else {
        addFinishedStepToStorage(cardId, stepId);
      }
    },
    [addFinishedStepToStorage, removeFinishedStepFromStorage, state.onboardingSteps]
  );

  const onProductSwitchChanged = useCallback(
    (section: Switch) => {
      dispatch({ type: OnboardingActions.ToggleProduct, payload: { section: section.id } });
      toggleActiveProductsInStorage(section.id);
    },
    [toggleActiveProductsInStorage]
  );

  useEffect(() => {
    /** Handle landing on the page without hash
     ** e.g.: https://localhost:5601/app/security/get_started
     ** If there is no expanded card step in storage, do nothing.
     ** If there is expanded card step in storage, sync it to the url.
     **/
    if (!stepIdFromHash) {
      // If all steps are collapsed, do nothing
      if (Object.values(state.expandedCardSteps).every((c) => !c.isExpanded)) {
        return;
      }

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
    }
  }, [
    expandedCardsInitialStates,
    getAllExpandedCardStepsFromStorage,
    navigateTo,
    state.expandedCardSteps,
    stepIdFromHash,
  ]);

  useEffect(() => {
    /** Handle hash change and expand the target step.
     ** e.g.: https://localhost:5601/app/security/get_started#create_your_first_project
     **/
    if (stepIdFromHash) {
      const { matchedCard, matchedStep, matchedSection } = findCardSectionByStepId(stepIdFromHash);
      const hasStepContent = matchedStep && matchedStep.description;
      if (hasStepContent && matchedCard && matchedStep && matchedSection) {
        // If the step is already expanded, do nothing
        if (state.expandedCardSteps[matchedCard.id]?.expandedSteps.includes(matchedStep.id)) {
          return;
        }
        // Toggle step and sync the expanded card step to storage & reducer
        onStepClicked({
          stepId: matchedStep.id,
          cardId: matchedCard.id,
          sectionId: matchedSection.id,
          isExpanded: true,
        });

        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: `#${matchedStep.id}`,
        });
      }
    }
  }, [navigateTo, onStepClicked, state.expandedCardSteps, stepIdFromHash]);

  return {
    state,
    onStepClicked,
    toggleTaskCompleteStatus,
    onProductSwitchChanged,
  };
};
