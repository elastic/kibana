/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnyAction, Reducer } from 'redux';

type EmptyObject = Record<string | number, never>;

export interface SecurityFlyoutPanel {
  /**
   * The type of flyout to show
   */
  panelKind?: string;
  /**
   * Any parameters necessary for the initial requests within the flyout
   */
  params?: Record<string, unknown>;
  /**
   * Tracks visual state such as whether the panel is collapsed
   */
  state?: Record<string, unknown>;
}

export interface VisualizeFlyoutPanel {
  panelKind: 'visualize';
  params: {
    eventId: string;
  };
}

export interface SecurityFlyout extends SecurityFlyoutPanel {
  /**
   * Configuration for the expanded (left) section of the flyout. Essentially the same as the primary (right) side.
   */
  expandedSection?: SecurityFlyoutPanel;
}

export interface EventFlyout extends SecurityFlyout {
  panelKind: 'event';
  params: {
    eventId: string;
    indexName: string;
  };
  expandedSection?: VisualizeFlyoutPanel;
}

export type SecurityFlyoutTypes = EventFlyout | EmptyObject;

export type SecurityFlyoutScopes = 'globalFlyout' | 'timelineFlyout';

export interface SecurityFlyoutReducerByScope {
  globalFlyout?: SecurityFlyoutTypes;
  timelineFlyout?: SecurityFlyoutTypes;
}

export type SecurityFlyoutState = SecurityFlyoutReducerByScope;

export type SecurityFlyoutActionWithScope<T = {}> = {
  flyoutScope: SecurityFlyoutScopes;
} & T;
