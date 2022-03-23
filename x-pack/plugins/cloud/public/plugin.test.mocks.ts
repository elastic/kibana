/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { FullStoryDeps, FullStoryApi, FullStoryService } from './fullstory';

export const fullStoryApiMock: jest.Mocked<FullStoryApi> = {
  event: jest.fn(),
  setUserVars: jest.fn(),
  setVars: jest.fn(),
  identify: jest.fn(),
};
export const initializeFullStoryMock = jest.fn<FullStoryService, [FullStoryDeps]>(() => ({
  fullStory: fullStoryApiMock,
  sha256,
}));
jest.doMock('./fullstory', () => {
  return { initializeFullStory: initializeFullStoryMock };
});
