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

const locationSchema = {
  type: 'keyword' as const,
  _meta: {
    description: 'Where the flyout was opened from (e.g., service_inventory, service_overview)',
  },
};

const serviceNameSchema = {
  type: 'keyword' as const,
  _meta: { description: 'The APM service name' },
};

const sloIdSchema = {
  type: 'keyword' as const,
  _meta: { description: 'The SLO identifier' },
};

const sloOverviewFlyoutViewedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_VIEWED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
  },
};

const sloOverviewFlyoutServiceNameClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SERVICE_NAME_CLICKED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
  },
};

const sloOverviewFlyoutSloLinkClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SLO_LINK_CLICKED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
  },
};

const sloOverviewFlyoutAlertClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_ALERT_CLICKED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
    sloId: sloIdSchema,
  },
};

const sloOverviewFlyoutSearchQueriedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
    searchQuery: {
      type: 'keyword',
      _meta: { description: 'The search query entered by the user' },
    },
  },
};

const sloOverviewFlyoutStatusFilteredEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_STATUS_FILTERED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
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

const sloOverviewFlyoutSloClickedEventType: TelemetryEvent = {
  eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SLO_CLICKED,
  schema: {
    location: locationSchema,
    serviceName: serviceNameSchema,
    sloId: sloIdSchema,
  },
};

export const apmTelemetryEventBasedTypes = [
  searchQuerySubmittedEventType,
  sloOverviewFlyoutViewedEventType,
  sloOverviewFlyoutServiceNameClickedEventType,
  sloOverviewFlyoutSloLinkClickedEventType,
  sloOverviewFlyoutAlertClickedEventType,
  sloOverviewFlyoutSearchQueriedEventType,
  sloOverviewFlyoutStatusFilteredEventType,
  sloOverviewFlyoutSloClickedEventType,
];
