/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export enum SecurityCellActionsTrigger {
  DEFAULT = 'security-default-cellActions',
  DETAILS_FLYOUT = 'security-detailsFlyout-cellActions',
  ALERTS_COUNT = 'security-alertsCount-cellActions',
}

export enum DiscoverInTimelineTrigger {
  HISTOGRAM_TRIGGER = 'security-discoverInTimeline-histogramTrigger',
}

export enum DiscoverInTimelineAction {
  VIS_FILTER_ACTION = 'security-discoverInTimeline-visFilterAction',
}

export enum SecurityCellActionType {
  FILTER = 'security-cellAction-type-filter',
  COPY = 'security-cellAction-type-copyToClipboard',
  ADD_TO_TIMELINE = 'security-cellAction-type-addToTimeline',
  INVESTIGATE_IN_NEW_TIMELINE = 'security-cellAction-type-investigateInNewTimeline',
  SHOW_TOP_N = 'security-cellAction-type-showTopN',
  TOGGLE_COLUMN = 'security-cellAction-type-toggleColumn',
}
