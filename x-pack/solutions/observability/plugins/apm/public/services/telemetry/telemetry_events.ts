/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryEvent } from './types';
import { TelemetryEventTypes } from './types';

const searchQuerySubmittedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SEARCH_QUERY_SUBMITTED,
  schema: {
    kueryFields: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'The kuery fields used in the search',
        },
      },
    },
    timerange: {
      type: 'text',
      _meta: {
        description: 'The timerange of the search',
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'The action performed (e.g., submit, refresh)',
      },
    },
  },
};

const sloOverviewFlyoutViewedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_VIEWED,
  schema: {},
};

const sloOverviewFlyoutSearchQueriedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED,
  schema: {
    searchQuery: {
      type: 'keyword',
      _meta: { description: 'The search query entered by the user' },
    },
  },
};

const sloOverviewFlyoutStatusFilteredEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_STATUS_FILTERED,
  schema: {
    statuses: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'A status filter value (e.g., VIOLATED, DEGRADING, HEALTHY, NO_DATA)',
        },
      },
    },
  },
};

const sloInfoShownEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_INFO_SHOWN,
  schema: {},
};

const sloCreateFlowStartedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_CREATE_FLOW_STARTED,
  schema: {
    sloType: {
      type: 'keyword',
      _meta: {
        description: 'The type of SLO for which the create flow was started',
      },
    },
    location: {
      type: 'keyword',
      _meta: {
        description: 'The location from which the SLO create flow was started',
      },
    },
  },
};

const sloManageFlowStartedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_MANAGE_FLOW_STARTED,
  schema: {
    location: {
      type: 'keyword',
      _meta: {
        description: 'The location from which the SLO manage flow was started',
      },
    },
  },
};

const sloAppRedirectClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_APP_REDIRECT_CLICKED,
  schema: {
    location: {
      type: 'keyword',
      _meta: {
        description: 'The location from which the SLO app redirect was clicked',
      },
    },
  },
};

const sloTopNavClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_TOP_NAV_CLICKED,
  schema: {},
};

export const apmTelemetryEventBasedTypes = [
  searchQuerySubmittedEventType,
  sloOverviewFlyoutViewedEventType,
  sloOverviewFlyoutSearchQueriedEventType,
  sloOverviewFlyoutStatusFilteredEventType,
  sloInfoShownEventType,
  sloCreateFlowStartedEventType,
  sloManageFlowStartedEventType,
  sloAppRedirectClickedEventType,
  sloTopNavClickedEventType,
];
