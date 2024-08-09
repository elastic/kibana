/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSections, getCards } from './sections';
import { CardId } from './types';
import type { ActiveSections, Card, Section } from './types';

export const CONTENT_WIDTH = 1150;

export const DEFAULT_FINISHED_CARDS: CardId[] = [CardId.createFirstProject];

export const isDefaultFinishedCard = (cardId: CardId, onboardingSteps: CardId[]) =>
  DEFAULT_FINISHED_CARDS.indexOf(cardId) >= 0 && onboardingSteps?.includes(cardId);

export const getActiveCards = (cards: Card[] | undefined, onboardingSteps: CardId[]) =>
  cards?.filter((card) => onboardingSteps.includes(card.id));

export const findCardSectionByCardId = (
  cardId: string
): { matchedCard: Card | null; matchedSection: Section | null } => {
  const cards = getCards();

  const matchedCard = cards.find((c) => c.id === cardId) ?? null;

  const matchedSection = matchedCard
    ? getSections().find((s) => s.cards?.includes(matchedCard)) ?? null
    : null;

  return { matchedCard, matchedSection };
};

export const setupActiveSections = (finishedCardsId: Set<CardId>, onboardingSteps: CardId[]) =>
  getSections().reduce<ActiveSections>((acc, section) => {
    const activeCards = getActiveCards(section.cards, onboardingSteps);

    if (activeCards && Object.keys(activeCards).length > 0) {
      acc[section.id] = activeCards.reduce<Partial<Record<CardId, Card>>>((accCards, card) => {
        const isCompleted = finishedCardsId.has(card.id);
        accCards[card.id] = {
          ...card,
          isCompleted,
        };
        return accCards;
      }, {});
    }
    return acc;
  }, {});

export const updateActiveSections = ({
  finishedCardIds,
  onboardingSteps,
}: {
  finishedCardIds: Set<CardId>;
  onboardingSteps: CardId[];
}): ActiveSections => {
  return setupActiveSections(finishedCardIds, onboardingSteps);
};
