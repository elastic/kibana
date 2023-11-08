/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSections } from './sections';
import type { Card, CardId, SectionId } from './types';

export const getLeftCards = (cards: Card[] | undefined, cardsDone: Set<CardId>) =>
  (cards?.length ?? 0) - (cardsDone.size ?? 0);

export const getCard = ({ cardId, sectionId }: { cardId: CardId; sectionId: SectionId }) => {
  const sections = getSections();
  const section = sections.find(({ id }) => id === sectionId);
  const cards = section?.cards;
  const card = cards?.find(({ id }) => id === cardId);

  return card;
};

export const getTotalCardsNumber = () =>
  getSections().reduce((acc, curr) => {
    return (curr.cards ?? []).length + acc;
  }, 0);

export const getTotalUndoneCardsNumber = (finishedCardNUmber: number) =>
  getTotalCardsNumber() - finishedCardNUmber;

export const setupActiveSections = (finishedCards: Record<SectionId, Set<CardId>>) => {
  const totalCards = getSections().reduce((acc, curr) => {
    return (curr.cards ?? []).length + acc;
  }, 0);
  const totalFinishedCards = Object.values(finishedCards).reduce((acc, curr) => acc + curr.size, 0);
  const totalCardsLeft = totalCards - totalFinishedCards;
  return { totalCardsLeft, totalCards };
};
