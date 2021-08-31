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
  getAddToCasePopover: jest
    .fn()
    .mockReturnValue(<div data-test-subj="add-to-case-action">{'Add to case'}</div>),
  getAddToCaseAction: jest.fn(),
  getAddToExistingCaseButton: jest.fn().mockReturnValue(
    <div key="add-to-existing-case-action" data-test-subj="add-to-existing-case-action">
      {'Add to existing case'}
    </div>
  ),
  getAddToNewCaseButton: jest.fn().mockReturnValue(
    <div key="add-to-new-case-action" data-test-subj="add-to-new-case-action">
      {'Add to new case'}
    </div>
  ),
};
