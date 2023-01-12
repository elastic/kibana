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
  panelKind?: string; // TODO: Should this be a different name like ID or Category?
  /**
   * Any parameters necessary for the initial requests within the flyout
   */
  params?: Record<string, unknown>;
  /**
   * Tracks the path for what to show in a panel. We may have multiple tabs or :details etc, so easiest to just use a stack
   */
  path?: string[];
  /**
   * Tracks visual state such as whether the panel is collapsed
   */
  state?: Record<string, unknown>;
}

// TODO: QUESTION: Should these live here or should they be co-located with their components?
// These are really only necessary if this panel can live independent of a parent event component or wrapper
// In the nested tabs scenario this isn't reallly necessary, as a parent event component would be the only thing that needs this query
// ...but, thinking through this more, theres an opportunity for us to create independent re-usable components or views.
// For instance (There is a case for re-using the table and/or json views for example) in other places
// As well as re-using minimized visualize panels in the application as well
// Given our history of creating a component/view then wanting to utilize it somewhere else in the application, I think it's worth the effort

export interface VisualizePanel extends SecurityFlyoutPanel {
  panelKind?: 'visualize';
  params?: {
    eventId: string;
    indexName: string;
  };
}

export type EventPanelPaths = 'overview' | 'table' | 'json';

export interface EventPanel extends SecurityFlyoutPanel {
  panelKind?: 'event';
  path?: EventPanelPaths[];
  params?: {
    eventId: string;
    indexName: string;
  };
}

export interface TablePanel extends SecurityFlyoutPanel {
  panelKind?: 'table';
  params?: { eventId: string; indexName: string };
}

export interface JSONPanel extends SecurityFlyoutPanel {
  panelKind?: 'json';
  params?: { eventId: string; indexName: string };
}

export interface OverviewPanel extends SecurityFlyoutPanel {
  panelKind?: 'overview';
  params?: { eventId: string; indexName: string };
}
