/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockGetAllFinishedCardsFromStorage = jest.fn(() => []);
export const mockResetAllExpandedCardToStorage = jest.fn();
export const mockAddFinishedCardToStorage = jest.fn();
export const mockRemoveFinishedCardFromStorage = jest.fn();
export const mockAddExpandedCardToStorage = jest.fn();
export const mockRemoveExpandedCardFromStorage = jest.fn();
export const mockGetAllExpandedCardsFromStorage = jest.fn(() => new Set());
