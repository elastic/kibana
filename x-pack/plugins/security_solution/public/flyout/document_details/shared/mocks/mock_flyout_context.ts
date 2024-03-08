/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpandableFlyoutApi } from '@kbn/expandable-flyout';

/**
 * Mock flyout api
 */
export const mockFlyoutApi: ExpandableFlyoutApi = {
  openFlyout: jest.fn(),
  openRightPanel: jest.fn(),
  openLeftPanel: jest.fn(),
  openPreviewPanel: jest.fn(),
  closeRightPanel: jest.fn(),
  closeLeftPanel: jest.fn(),
  closePreviewPanel: jest.fn(),
  previousPreviewPanel: jest.fn(),
  closeFlyout: jest.fn(),
};
