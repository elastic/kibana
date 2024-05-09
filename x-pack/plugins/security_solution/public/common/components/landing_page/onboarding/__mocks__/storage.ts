/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockGetAllFinishedStepsFromStorage = jest.fn(() => ({}));
export const mockGetFinishedStepsFromStorageByCardId = jest.fn(() => []);
export const mockGetActiveProductsFromStorage = jest.fn(() => []);
export const mockToggleActiveProductsInStorage = jest.fn();
export const mockResetAllExpandedCardStepsToStorage = jest.fn();
export const mockAddFinishedStepToStorage = jest.fn();
export const mockRemoveFinishedStepFromStorage = jest.fn();
export const mockAddExpandedCardStepToStorage = jest.fn();
export const mockRemoveExpandedCardStepFromStorage = jest.fn();
export const mockGetAllExpandedCardStepsFromStorage = jest.fn(() => ({}));
