/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockFlashMessagesValues = {
  messages: [],
  queuedMessages: [],
};

export const mockFlashMessagesActions = {
  setFlashMessages: jest.fn(),
  clearFlashMessages: jest.fn(),
  setQueuedMessages: jest.fn(),
  clearQueuedMessages: jest.fn(),
};
