/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SecurityFlyoutPanel {
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

// Panel model types below

export interface VisualizePanel extends SecurityFlyoutPanel {
  panelKind: 'visualize';
  params: {
    eventId: string;
    indexName: string;
  };
}

export interface EventPanel extends SecurityFlyoutPanel {
  panelKind: 'event';
  params: {
    eventId: string;
    indexName: string;
  };
}

export interface TablePanel extends SecurityFlyoutPanel {
  panelKind: 'table';
  params: { eventId: string; indexName: string };
}
