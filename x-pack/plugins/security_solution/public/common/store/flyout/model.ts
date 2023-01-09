/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventPanel, VisualizePanel, TablePanel } from './panel-models';

export * from './panel-models';

export type SecurityFlyoutPanel =
  | EventPanel
  | VisualizePanel
  | TablePanel
  | Record<string | number, never>; // Empty object

export interface SecurityFlyout {
  left?: SecurityFlyoutPanel;
  right?: SecurityFlyoutPanel;
  preview?: SecurityFlyoutPanel;
}

export type SecurityFlyoutScopes = 'globalFlyout' | 'timelineFlyout';

export interface SecurityFlyoutReducerByScope {
  globalFlyout?: SecurityFlyout;
  timelineFlyout?: SecurityFlyout;
}

export type SecurityFlyoutState = SecurityFlyoutReducerByScope;

export type SecurityFlyoutActionWithScope<T = {}> = {
  flyoutScope: SecurityFlyoutScopes;
} & T;
