/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from '../../common/product';
import { getSections } from './sections';
import type { ActiveCard, ActiveCards, Card, CardId, SectionId, StepId } from './types';

export const getCardTimeInMinutes = (card: Card, stepsDone: Set<StepId>) =>
  card.steps?.reduce(
    (totalMin, { timeInMinutes, id: stepId }) =>
      totalMin + (stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
    0
  ) ?? 0;

export const getCardStepsLeft = (card: Card, stepsDone: Set<StepId>) =>
  (card.steps?.length ?? 0) - (stepsDone.size ?? 0);

export const isCardActive = (card: Card, activeProducts: Set<ProductLine>) =>
  !card.productLineRequired ||
  card.productLineRequired?.some((condition) => activeProducts.has(condition));

export const setupCards = (
  finishedSteps: Record<CardId, Set<StepId>>,
  activeProducts: Set<ProductLine>
) =>
  activeProducts.size > 0
    ? getSections().reduce((acc, section) => {
        const cardsInSections = section.cards?.reduce((accCards, card) => {
          if (isCardActive(card, activeProducts)) {
            const stepsDone: Set<StepId> = finishedSteps[card.id] ?? new Set();
            const timeInMins = getCardTimeInMinutes(card, stepsDone);
            const stepsLeft = getCardStepsLeft(card, stepsDone);

            accCards[card.id] = {
              id: card.id,
              timeInMins,
              stepsLeft,
            };
          }
          return accCards;
        }, {} as Record<CardId, ActiveCard>);
        if (cardsInSections) {
          acc[section.id] = cardsInSections;
        }
        return acc;
      }, {} as ActiveCards)
    : null;

export const updateCard = ({
  finishedSteps,
  activeProducts,
  activeCards,
  sectionId,
  cardId,
}: {
  finishedSteps: Record<CardId, Set<StepId>>;
  activeProducts: Set<ProductLine>;
  activeCards: ActiveCards | null;
  sectionId: SectionId;
  cardId: CardId;
}): ActiveCards | null => {
  const sections = getSections();
  const section = sections.find(({ id }) => id === sectionId);
  const cards = section?.cards;
  const card = cards?.find(({ id }) => id === cardId);

  if (!card || !activeCards) {
    return activeCards;
  }

  if (isCardActive(card, activeProducts)) {
    const stepsDone = finishedSteps[cardId] ?? new Set();
    const timeInMins = getCardTimeInMinutes(card, stepsDone);
    const stepsLeft = getCardStepsLeft(card, stepsDone);

    return {
      ...activeCards,
      [sectionId]: {
        ...activeCards[sectionId],
        [cardId]: {
          id: cardId,
          timeInMins,
          stepsLeft,
        },
      },
    };
  }
  return activeCards;
};
