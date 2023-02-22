/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  InfraTelemetryEventTypes,
  InfraTelemetryEvent,
  HostsViewQuerySubmittedSchema,
  HostEntryClickedSchema,
} from './types';

const hostsViewQuerySubmittedSchema: HostsViewQuerySubmittedSchema = {
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
};

const hostsEntryClickedSchema: HostEntryClickedSchema = {
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
};

export const infraTelemetryEvents: InfraTelemetryEvent[] = [
  {
    eventType: InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED,
    schema: hostsViewQuerySubmittedSchema,
  },
  {
    eventType: InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED,
    schema: hostsEntryClickedSchema,
  },
];
