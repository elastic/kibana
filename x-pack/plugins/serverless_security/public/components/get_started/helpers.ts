/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSections } from './sections';
import { ActiveCard, CardId, ProductId, SectionId, StepId } from './types';

export const setupCards = (
  finishedSteps: Record<CardId, Set<StepId>>,
  activeSections: Set<ProductId>
): Record<CardId, ActiveCard> | null =>
  activeSections.size > 0
    ? getSections().reduce((acc, section) => {
        const cardsInSections = section.cards?.reduce((accCards, card) => {
          if (
            !card.productTypeRequired ||
            card?.productTypeRequired?.some((condition) => activeSections.has(condition))
          ) {
            const stepsDone = finishedSteps[card.id] ?? new Set();
            const timeInMins = card?.steps?.reduce(
              (totalMin, { timeInMinutes, id: stepId }) =>
                (totalMin += stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
              0
            );
            const stepsLeft = (card?.steps?.length ?? 0) - (stepsDone?.size ?? 0);

            return {
              ...accCards,
              [card.id]: {
                id: card.id,
                timeInMins,
                stepsLeft,
              },
            };
          }
          return accCards;
        }, {});
        return { ...acc, ...cardsInSections };
      }, {} as Record<CardId, ActiveCard>)
    : null;

export const updateCard = ({
  finishedSteps,
  activeSections,
  activeCards,
  sectionId,
  cardId,
}: {
  finishedSteps: Record<CardId, Set<StepId>>;
  activeSections: Set<ProductId>;
  activeCards: Record<CardId, ActiveCard> | null;
  sectionId: SectionId;
  cardId: CardId;
}): Record<CardId, ActiveCard> | null => {
  const sections = getSections();
  const section = sections.find(({ id }) => id === sectionId);
  const cards = section?.cards;
  const card = cards?.find(({ id }) => id === cardId);

  if (!card || !activeCards) {
    return activeCards ?? null;
  }

  if (
    !card.productTypeRequired ||
    card?.productTypeRequired?.some((condition) => activeSections.has(condition))
  ) {
    const stepsDone = finishedSteps[cardId] ?? new Set();
    const timeInMins =
      card?.steps?.reduce(
        (totalMin, { timeInMinutes, id: stepId }) =>
          (totalMin += stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
        0
      ) ?? 0;
    const stepsLeft = (card?.steps?.length ?? 0) - (stepsDone?.size ?? 0);
    return {
      ...activeCards,
      [cardId]: {
        id: cardId,
        timeInMins,
        stepsLeft,
      },
    };
  }
  return null;
};
