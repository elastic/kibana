/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from '../../common/product';
import { getSections } from './sections';
import type { ActiveCard, ActiveSections, CardId, SectionId, Step, StepId } from './types';

export const getCardTimeInMinutes = (activeSteps: Step[] | undefined, stepsDone: Set<StepId>) =>
  activeSteps?.reduce(
    (totalMin, { timeInMinutes, id: stepId }) =>
      totalMin + (stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
    0
  ) ?? 0;

export const getCardStepsLeft = (activeSteps: Step[] | undefined, stepsDone: Set<StepId>) =>
  (activeSteps?.length ?? 0) - (stepsDone.size ?? 0);

export const isStepActive = (step: Step, activeProducts: Set<ProductLine>) =>
  !step.productLineRequired ||
  step.productLineRequired?.some((condition) => activeProducts.has(condition));

const getfinishedActiveSteps = (
  finishedStepIds: Set<StepId> | undefined,
  activeSteps: Step[] | undefined
) => {
  const finishedStepIdsArray: StepId[] = Array.from(finishedStepIds ?? new Set());

  const finishedActiveSteps = finishedStepIdsArray.reduce((acc, stepId) => {
    const activeStep = activeSteps?.find(({ id }) => id === stepId);
    if (activeStep) {
      acc.push(activeStep.id);
    }
    return acc;
  }, [] as StepId[]);

  return new Set(finishedActiveSteps);
};

export const setupCards = (
  finishedSteps: Record<CardId, Set<StepId>>,
  activeProducts: Set<ProductLine>
) =>
  activeProducts.size > 0
    ? getSections().reduce((acc, section) => {
        const activeCards =
          section.cards?.reduce((accCards, card) => {
            const activeSteps = card.steps?.filter((step) => isStepActive(step, activeProducts));
            const stepsDone: Set<StepId> = getfinishedActiveSteps(
              finishedSteps[card.id],
              activeSteps
            );
            const timeInMins = getCardTimeInMinutes(activeSteps, stepsDone);
            const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

            accCards[card.id] = {
              id: card.id,
              timeInMins,
              stepsLeft,
              activeSteps,
            };

            return accCards;
          }, {} as Record<CardId, ActiveCard>) ?? {};

        if (Object.keys(activeCards).length > 0) {
          acc[section.id] = activeCards;
        }
        return acc;
      }, {} as ActiveSections)
    : null;

export const updateCard = ({
  finishedSteps,
  activeSections,
  sectionId,
  cardId,
}: {
  finishedSteps: Record<CardId, Set<StepId>>;
  activeSections: ActiveSections | null;
  sectionId: SectionId;
  cardId: CardId;
}): ActiveSections | null => {
  const activeCards = activeSections ? activeSections[sectionId] : undefined;
  const card = activeCards ? activeCards[cardId] : undefined;

  if (!card || !activeSections) {
    return activeSections;
  }

  const activeSteps = card.activeSteps;
  const stepsDone: Set<StepId> = getfinishedActiveSteps(finishedSteps[cardId], activeSteps);

  const timeInMins = getCardTimeInMinutes(activeSteps, stepsDone);
  const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

  return {
    ...activeSections,
    [sectionId]: {
      ...activeSections[sectionId],
      [cardId]: {
        id: cardId,
        timeInMins,
        stepsLeft,
        activeSteps,
      },
    },
  };
};
