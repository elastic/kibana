/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const onboardingStorage = {
  getAllFinishedStepsFromStorage: jest.fn(() => ({})),
  getFinishedStepsFromStorageByCardId: jest.fn(() => []),
  getActiveProductsFromStorage: jest.fn(() => []),
  toggleActiveProductsInStorage: jest.fn(() => []),
  resetAllExpandedCardStepsToStorage: jest.fn(),
  addFinishedStepToStorage: jest.fn(),
  removeFinishedStepFromStorage: jest.fn(),
  addExpandedCardStepToStorage: jest.fn(),
  removeExpandedCardStepFromStorage: jest.fn(),
  getAllExpandedCardStepsFromStorage: jest.fn(() => ({})),
};
