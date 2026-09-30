/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `data-ebt-action` values for Nightshift intents, shared by every plugin that surfaces them. */
export const NIGHTSHIFT_EBT_ACTIONS = {
  CLEAR_IMPACTED_SERVICES_FILTER: 'clearImpactedServicesFilter',
  CLOSE_FLYOUT: 'closeFlyout',
  CLOSE_SIGNIFICANT_EVENT: 'closeSignificantEvent',
  COLLAPSE_IMPACTED_SERVICES: 'collapseImpactedServices',
  COLLAPSE_DETECTIONS: 'collapseDetections',
  EXPAND_IMPACTED_SERVICES: 'expandImpactedServices',
  EXPAND_DETECTIONS: 'expandDetections',
  FILTER_BY_IMPACTED_SERVICES: 'filterByImpactedServices',
  OPEN_IN_CHAT: 'openInChat',
  OPEN_START_INVESTIGATION: 'openStartInvestigation',
  RETRY_INVESTIGATIONS: 'retryInvestigations',
  SHOW_MORE_INVESTIGATIONS: 'showMoreInvestigations',
  START_INVESTIGATION: 'startInvestigation',
  VIEW_ALL_SIGNIFICANT_EVENTS: 'viewAllSignificantEvents',
  VIEW_DETECTION: 'viewDetection',
  VIEW_ENTITY: 'viewEntity',
  VIEW_INVESTIGATION: 'viewInvestigation',
  VIEW_MANAGEMENT: 'viewManagement',
  VIEW_SETTINGS: 'viewSettings',
  VIEW_SIGNIFICANT_EVENT: 'viewSignificantEvent',
  VIEW_SIGNIFICANT_EVENTS: 'viewSignificantEvents',
} as const;
