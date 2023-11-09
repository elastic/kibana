/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSections } from './sections';
import { defaultFinishedCards } from './storage';
import type { CardId, SectionId } from './types';

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

export const hasCardDone = (cardId: CardId, finishedCards: Set<CardId>) =>
  finishedCards.has(cardId);

export const isDefaultFinishedCard = (cardId: CardId) => defaultFinishedCards.indexOf(cardId) >= 0;
