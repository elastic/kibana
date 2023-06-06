/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { sections } from './sections';
import { TogglePanelId } from './types';

export const useStorage = (storage: Storage) => {
  const addFinishedStepToStorage = useCallback(
    (cardId: string, stepId: string) => {
      const card = storage.get(cardId) ?? {};
      if (!card[stepId]) {
        card[stepId] = true;
        storage.set(cardId, card);
        return card;
      }
    },
    [storage]
  );
  const getFinishedStepsFromStorageByCardId = useCallback(
    (cardId: string) => {
      const card = storage.get(cardId) ?? {};
      return card;
    },
    [storage]
  );
  return useMemo(
    () => ({
      getActiveProductsFromStorage: () => {
        const activeProducts: Record<TogglePanelId, boolean> = storage.get('activeProducts');
        return activeProducts ?? {};
      },
      toggleActiveProductsInStorage: (sectionId: TogglePanelId) => {
        const activeProducts = storage.get('activeProducts') ?? {};
        if (!activeProducts[sectionId]) {
          activeProducts[sectionId] = true;
        } else {
          delete activeProducts[sectionId];
        }
        storage.set('activeProducts', activeProducts);
        return activeProducts;
      },
      getFinishedStepsFromStorageByCardId,
      getAllFinishedStepsFromStorage: () => {
        return sections.reduce<Record<string, Set<string>>>((acc, { cards }) => {
          if (cards) {
            cards?.every((card) => {
              acc[card.id] = getFinishedStepsFromStorageByCardId(card.id);
            });
          }
          return acc;
        }, {});
      },
      addFinishedStepToStorage,
      removeFinishedStep: (cardId: string, stepId: string) => {
        const card = storage.get(cardId) ?? {};
        if (card[stepId]) {
          delete card[stepId];
          storage.set(cardId, card);
          return card;
        }
      },
    }),
    [addFinishedStepToStorage, getFinishedStepsFromStorageByCardId, storage]
  );
};
