/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash/fp';
import type { SecurityFlyout, SecurityFlyoutPanel } from './model';

export const isValidSecurityFlyoutPanel = (panel: SecurityFlyoutPanel) => {
  const hasParams = isObject(panel?.params);
  const eventPanels = ['event', 'table', 'visualize', 'json'];

  if (eventPanels.includes(panel.panelKind) && hasParams) {
    return panel?.params?.eventId && panel?.params?.indexName;
  }

  return false;
};
// Helper to parse the flyout types to confirm they have the expected parameters
const isValidSecurityFlyout = (flyout: Record<string, unknown>) => {
  if (!flyout) return false;

  const flyoutPanel = flyout as SecurityFlyout;
  if (flyoutPanel.left && !isValidSecurityFlyoutPanel(flyoutPanel.left)) return false;
  if (flyoutPanel.right && !isValidSecurityFlyoutPanel(flyoutPanel.right)) return false;
  if (flyoutPanel.preview && !isValidSecurityFlyoutPanel(flyoutPanel.preview)) return false;

  return true;
};

// This is primarily used for testing information from the url state.
export const areUrlParamsValidSecurityFlyoutParams = (unknownFlyoutReducer: unknown): boolean => {
  // Confirm the unknownFlyoutReducer object exists
  if (!unknownFlyoutReducer || !isObject(unknownFlyoutReducer)) return false;

  const objectFlyout = unknownFlyoutReducer as {
    globalFlyout?: Record<string, unknown>;
    timelineFlyout?: Record<string, unknown>;
  };

  const { globalFlyout, timelineFlyout } = objectFlyout;

  if (globalFlyout && isObject(globalFlyout) && !isValidSecurityFlyout(globalFlyout)) {
    return false;
  }
  if (timelineFlyout && isObject(timelineFlyout) && !isValidSecurityFlyout(timelineFlyout)) {
    return false;
  }

  return true;
};
