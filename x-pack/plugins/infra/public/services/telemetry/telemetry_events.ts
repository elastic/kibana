/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InfraTelemetryEventTypes, InfraTelemetryEvent } from './types';

const hostsViewQuerySubmittedEvent: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED,
  schema: {
    control_filters: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'Selected host control filter.',
          optional: false,
        },
      },
    },
    filters: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'Applied host search filter.',
          optional: false,
        },
      },
    },
    interval: {
      type: 'text',
      _meta: {
        description: 'Time interval for the performed search.',
        optional: false,
      },
    },
    query: {
      type: 'text',
      _meta: {
        description: 'KQL query search for hosts',
        optional: false,
      },
    },
  },
};

const hostsEntryClickedEvent: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
  schema: {
    hostname: {
      type: 'keyword',
      _meta: {
        description: 'Hostname for the clicked host.',
        optional: false,
      },
    },
    cloud_provider: {
      type: 'keyword',
      _meta: {
        description: 'Cloud provider for the clicked host.',
        optional: true,
      },
    },
  },
};

const hostFlyoutRemoveFilter: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_REMOVED,
  schema: {
    field_name: {
      type: 'keyword',
      _meta: {
        description: 'Removed filter field name for the selected host.',
        optional: false,
      },
    },
  },
};
const hostFlyoutAddFilter: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_ADDED,
  schema: {
    field_name: {
      type: 'keyword',
      _meta: {
        description: 'Added filter field name for the selected host.',
        optional: false,
      },
    },
  },
};

export const infraTelemetryEvents = [
  hostsViewQuerySubmittedEvent,
  hostsEntryClickedEvent,
  hostFlyoutRemoveFilter,
  hostFlyoutAddFilter,
];
