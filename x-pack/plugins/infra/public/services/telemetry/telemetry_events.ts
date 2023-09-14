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
    control_filter_fields: {
      type: 'array',
      items: {
        type: 'text',
        _meta: {
          description: 'Selected host control filter.',
          optional: false,
        },
      },
    },
    filter_fields: {
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
    with_query: {
      type: 'boolean',
      _meta: {
        description: 'KQL query search for hosts',
        optional: false,
      },
    },
    limit: {
      type: 'integer',
      _meta: {
        description: 'Selected host limit',
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

const hostViewTotalHostCountRetrieved: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED,
  schema: {
    total: {
      type: 'integer',
      _meta: {
        description: 'Total number of hosts retrieved.',
        optional: false,
      },
    },
  },
};

const assetDetailsFlyoutViewed: InfraTelemetryEvent = {
  eventType: InfraTelemetryEventTypes.ASSET_DETAILS_FLYOUT_VIEWED,
  schema: {
    componentName: {
      type: 'keyword',
      _meta: {
        description: 'Hostname for the clicked host.',
        optional: false,
      },
    },
    assetType: {
      type: 'keyword',
      _meta: {
        description: 'Cloud provider for the clicked host.',
        optional: false,
      },
    },
    tabId: {
      type: 'keyword',
      _meta: {
        description: 'Cloud provider for the clicked host.',
        optional: true,
      },
    },
  },
};

export const infraTelemetryEvents = [
  assetDetailsFlyoutViewed,
  hostsViewQuerySubmittedEvent,
  hostsEntryClickedEvent,
  hostFlyoutRemoveFilter,
  hostFlyoutAddFilter,
  hostViewTotalHostCountRetrieved,
];
