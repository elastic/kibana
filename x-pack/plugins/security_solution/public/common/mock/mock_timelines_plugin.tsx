/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

export const mockTimelines = {
  getLastUpdated: jest.fn(),
  getLoadingPanel: jest.fn(),
  getFieldBrowser: jest.fn().mockReturnValue(<div data-test-subj="field-browser" />),
  getUseDraggableKeyboardWrapper: () =>
    jest.fn().mockReturnValue({
      onBlur: jest.fn(),
      onKeyDown: jest.fn(),
    }),
};
