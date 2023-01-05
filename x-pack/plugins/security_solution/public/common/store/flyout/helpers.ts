/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash/fp';
import type { SecurityFlyoutPanel } from './model';

// Helper to parse the flyout types to confirm they have the expected parameters
export const isValidFlyoutType = (flyout: Record<string, unknown>) => {
  if (!flyout || !flyout?.panelKind) return false;

  const flyoutPanel = flyout as SecurityFlyoutPanel;
  const hasParams = isObject(flyoutPanel?.params);

  if (flyoutPanel.panelKind === 'event' && hasParams) {
    return flyoutPanel?.params?.eventId && flyoutPanel?.params?.indexName;
  }

  return false;
};

export const areValidSecurityFlyoutScopes = (unknownFlyoutReducer: unknown): boolean => {
  // Confirm the unknownFlyoutReducer object exists
  if (!unknownFlyoutReducer || !isObject(unknownFlyoutReducer)) return false;

  const objectFlyout = unknownFlyoutReducer as {
    globalFlyout?: Record<string, unknown>;
    timelineFlyout?: Record<string, unknown>;
  };

  const { globalFlyout, timelineFlyout } = objectFlyout;

  if (globalFlyout && isObject(globalFlyout) && !isValidFlyoutType(globalFlyout)) {
    return false;
  }
  if (timelineFlyout && isObject(timelineFlyout) && !isValidFlyoutType(timelineFlyout)){
    return false;
  }

  return true;
};
