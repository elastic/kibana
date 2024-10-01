/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from './configs';
import { getSections } from './sections';
import type {
  ActiveCard,
  ActiveSections,
  Card,
  CardId,
  Section,
  SectionId,
  Step,
  StepId,
} from './types';
import { CreateProjectSteps, QuickStartSectionCardsId } from './types';

export const CONTENT_WIDTH = 1150;

export const IMG_HEADER_WIDTH = 128;

export const DEFAULT_FINISHED_STEPS: Partial<Record<CardId, StepId[]>> = {
  [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
};

export const isDefaultFinishedCardStep = (
  cardId: CardId,
  stepId: StepId,
  onboardingSteps: StepId[]
) => !!DEFAULT_FINISHED_STEPS[cardId]?.includes(stepId) && onboardingSteps?.includes(stepId);

export const getCardTimeInMinutes = (activeSteps: Step[] | undefined, stepsDone: Set<StepId>) =>
  activeSteps?.reduce(
    (totalMin, { timeInMinutes, id: stepId }) =>
      totalMin + (stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
    0
  ) ?? 0;

export const getCardStepsLeft = (activeSteps: Step[] | undefined, stepsDone: Set<StepId>) =>
  Math.max((activeSteps?.length ?? 0) - (stepsDone.size ?? 0), 0);

export const isStepActive = (step: Step, activeProducts: Set<ProductLine>) =>
  !step.productLineRequired ||
  step.productLineRequired?.some((condition) => activeProducts.has(condition));

export const getActiveSteps = (
  steps: Step[] | undefined,
  activeProducts: Set<ProductLine>,
  onboardingSteps: StepId[]
) =>
  steps?.filter((step) => onboardingSteps.includes(step.id) && isStepActive(step, activeProducts));

const getfinishedActiveSteps = (
  finishedStepIds: StepId[] | undefined,
  activeStepIds: StepId[] | undefined
) => {
  const finishedActiveSteps = finishedStepIds?.reduce((acc, finishedStepId) => {
    const activeFinishedStepId = activeStepIds?.find(
      (activeStepId) => finishedStepId === activeStepId
    );
    if (activeFinishedStepId) {
      acc.push(activeFinishedStepId);
    }
    return acc;
  }, [] as StepId[]);

  return new Set(finishedActiveSteps);
};

export const findCardSectionByStepId = (
  stepId: string
): { matchedCard: Card | null; matchedStep: Step | null; matchedSection: Section | null } => {
  const cards = getSections().flatMap((s) => s.cards);
  let matchedStep: Step | null = null;

  const matchedCard =
    cards.find(
      (c) =>
        !!c.steps?.find((step) => {
          if (stepId === step.id) {
            matchedStep = step;
            return true;
          } else {
            return false;
          }
        })
    ) ?? null;

  const matchedSection = matchedCard
    ? getSections().find((s) => s.cards?.includes(matchedCard)) ?? null
    : null;

  return { matchedCard, matchedStep, matchedSection };
};

export const getCard = ({ cardId, sectionId }: { cardId: CardId; sectionId: SectionId }) => {
  const sections = getSections();
  const section = sections.find(({ id }) => id === sectionId);
  const cards = section?.cards;
  const card = cards?.find(({ id }) => id === cardId);

  return card;
};

export const getStepsByActiveProduct = ({
  activeProducts,
  cardId,
  sectionId,
  onboardingSteps,
}: {
  activeProducts: Set<ProductLine>;
  cardId: CardId;
  sectionId: SectionId;
  onboardingSteps: StepId[];
}) => {
  const card = getCard({ cardId, sectionId });
  const steps = getActiveSteps(card?.steps, activeProducts, onboardingSteps);

  return steps;
};

export const setupActiveSections = (
  finishedSteps: Record<CardId, Set<StepId>>,
  activeProducts: Set<ProductLine>,
  onboardingSteps: StepId[]
) =>
  activeProducts.size > 0
    ? getSections().reduce(
        (acc, section) => {
          const activeCards =
            section.cards?.reduce((accCards, card) => {
              const activeSteps = getActiveSteps(card.steps, activeProducts, onboardingSteps);
              const activeStepIds = activeSteps?.map(({ id }) => id);
              const stepsDone: Set<StepId> = getfinishedActiveSteps(
                finishedSteps[card.id] ? [...finishedSteps[card.id]] : undefined,
                activeStepIds
              );
              const timeInMins = getCardTimeInMinutes(activeSteps, stepsDone);
              const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);
              acc.totalStepsLeft += stepsLeft;
              acc.totalActiveSteps += activeStepIds?.length ?? 0;

              if (activeSteps && activeSteps.length > 0) {
                accCards[card.id] = {
                  id: card.id,
                  timeInMins,
                  stepsLeft,
                  activeStepIds,
                };
              }

              return accCards;
            }, {} as Record<CardId, ActiveCard>) ?? {};

          if (Object.keys(activeCards).length > 0) {
            acc.activeSections[section.id] = activeCards;
          }
          return acc;
        },
        { activeSections: {} as ActiveSections, totalStepsLeft: 0, totalActiveSteps: 0 }
      )
    : { activeSections: null, totalStepsLeft: null, totalActiveSteps: null };

export const updateActiveSections = ({
  activeProducts,
  activeSections,
  cardId,
  finishedSteps,
  onboardingSteps,
  sectionId,
}: {
  activeProducts: Set<ProductLine>;
  activeSections: ActiveSections | null;
  cardId: CardId;
  finishedSteps: Record<CardId, Set<StepId>>;
  onboardingSteps: StepId[];
  sectionId: SectionId;
}): {
  activeSections: ActiveSections | null;
  totalStepsLeft: number | null;
  totalActiveSteps: number | null;
} => {
  const activeSection = activeSections ? activeSections[sectionId] : undefined;
  const activeCard = activeSection ? activeSection[cardId] : undefined;

  if (!activeCard || !activeSections) {
    return { activeSections, totalActiveSteps: null, totalStepsLeft: null };
  }

  const steps = getStepsByActiveProduct({ activeProducts, cardId, sectionId, onboardingSteps });

  const activeStepIds = activeCard.activeStepIds;
  const stepsDone: Set<StepId> = getfinishedActiveSteps(
    finishedSteps[cardId] ? [...finishedSteps[cardId]] : undefined,
    activeStepIds
  );

  const timeInMins = getCardTimeInMinutes(steps, stepsDone);
  const stepsLeft = getCardStepsLeft(steps, stepsDone);

  const newActiveSections = {
    ...activeSections,
    [sectionId]: {
      ...activeSections[sectionId],
      ...(activeStepIds && activeStepIds?.length > 0
        ? {
            [cardId]: {
              id: cardId,
              timeInMins,
              stepsLeft,
              activeStepIds,
            },
          }
        : {}),
    },
  };

  const { totalStepsLeft, totalActiveSteps } = Object.values(newActiveSections).reduce(
    (acc, newActiveSection) => {
      Object.values(newActiveSection).forEach(
        (newActiveCard) => {
          acc.totalStepsLeft += newActiveCard.stepsLeft;
          acc.totalActiveSteps += newActiveCard?.activeStepIds?.length ?? 0;
        },
        { totalStepsLeft: 0, totalActiveSteps: 0 }
      );

      return acc;
    },
    { totalStepsLeft: 0, totalActiveSteps: 0 }
  );

  return {
    activeSections: newActiveSections,
    totalStepsLeft,
    totalActiveSteps,
  };
};

export const getTotalStepsLeftAndActiveSteps = (activeSections: ActiveSections | null) =>
  Object.values(activeSections ?? {}).reduce(
    (acc, activeSection) => {
      Object.values(activeSection).forEach(
        (newActiveCard) => {
          acc.totalStepsLeft += newActiveCard.stepsLeft;
          acc.totalActiveSteps += newActiveCard?.activeStepIds?.length ?? 0;
        },
        { totalStepsLeft: 0, totalActiveSteps: 0 }
      );

      return acc;
    },
    { totalStepsLeft: 0, totalActiveSteps: 0 }
  );
