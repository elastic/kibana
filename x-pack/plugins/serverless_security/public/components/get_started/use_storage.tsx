/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { ProductId } from './types';

const ACTIVE_PRODUCTS_STORAGE_KEY = 'ACTIVE_PRODUCTS';
const FINISHED_STEPS_STORAGE_KEY = 'FINISHED_STEPS';

export const useStorage = (storage: Storage) => {
  const addFinishedStepToStorage = useCallback(
    (cardId: string, stepId: string) => {
      const finishedSteps: Record<string, Record<string, boolean> | undefined> =
        storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
      const card = finishedSteps[cardId] ?? {};
      if (!card[stepId]) {
        card[stepId] = true;
        storage.set(FINISHED_STEPS_STORAGE_KEY, {
          finishedSteps: { ...finishedSteps, [cardId]: card },
        });
      }
    },
    [storage]
  );
  const getFinishedStepsFromStorageByCardId = useCallback(
    (cardId: string) => {
      const finishedSteps = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
      const card = finishedSteps[cardId] ?? {};
      return card;
    },
    [storage]
  );
  return useMemo(
    () => ({
      getActiveProductsFromStorage: () => {
        const activeProducts: Record<ProductId, boolean> = storage.get(ACTIVE_PRODUCTS_STORAGE_KEY);
        return activeProducts ?? {};
      },
      toggleActiveProductsInStorage: (sectionId: ProductId) => {
        const activeProducts = storage.get(ACTIVE_PRODUCTS_STORAGE_KEY) ?? {};
        if (!activeProducts[sectionId]) {
          activeProducts[sectionId] = true;
        } else {
          delete activeProducts[sectionId];
        }
        storage.set(ACTIVE_PRODUCTS_STORAGE_KEY, activeProducts);
        return activeProducts;
      },
      getFinishedStepsFromStorageByCardId,
      getAllFinishedStepsFromStorage: () => {
        const allFinishedSteps: Record<string, Record<string, boolean>> = storage.get(
          FINISHED_STEPS_STORAGE_KEY
        ) ?? {};
        return allFinishedSteps;
      },
      addFinishedStepToStorage,
      removeFinishedStep: (cardId: string, stepId: string) => {
        const finishedSteps = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
        const card = finishedSteps[cardId] ?? {};
        if (card[stepId]) {
          delete card[stepId];
        }
        storage.set(FINISHED_STEPS_STORAGE_KEY, finishedSteps);
      },
    }),
    [addFinishedStepToStorage, getFinishedStepsFromStorageByCardId, storage]
  );
};
