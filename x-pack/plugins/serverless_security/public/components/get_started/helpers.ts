/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSectionsInitialStates } from './reducer';
import { Card, CardId, Section, StepId } from './types';

export const updateSections = (
  finishedSteps: Record<CardId, Set<StepId>>,
  activeSections: Set<string>
) =>
  activeSections.size > 0
    ? getSectionsInitialStates()?.reduce((acc, currentSection) => {
        const cardsInCurrentSection = currentSection.cards?.reduce((accCards, currentCard) => {
          if (currentCard?.activeConditions?.some((condition) => activeSections.has(condition))) {
            const stepsDone = finishedSteps[currentCard.id] ?? new Set();
            currentCard.timeInMins =
              currentCard?.steps?.reduce(
                (totalMin, { timeInMinutes, id: stepId }) =>
                  (totalMin += stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
                0
              ) ?? 0;
            currentCard.stepsLeft = (currentCard?.steps?.length ?? 0) - (stepsDone?.size ?? 0);

            accCards.push(currentCard);
          }
          return accCards;
        }, [] as Card[]);
        if (cardsInCurrentSection) {
          acc.push({ ...currentSection, cards: cardsInCurrentSection });
        }
        return acc;
      }, [] as Section[]) ?? null
    : null;
