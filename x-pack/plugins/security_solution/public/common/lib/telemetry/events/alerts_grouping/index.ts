/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const alertsGroupingToggledEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AlertsGroupingToggled,
  schema: {
    isOpen: {
      type: 'boolean',
      _meta: {
        description: 'on or off',
        optional: false,
      },
    },
    tableId: {
      type: 'keyword',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    groupNumber: {
      type: 'integer',
      _meta: {
        description: 'Group number',
        optional: false,
      },
    },
  },
};

export const alertsGroupingChangedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AlertsGroupingChanged,
  schema: {
    tableId: {
      type: 'keyword',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    groupByField: {
      type: 'keyword',
      _meta: {
        description: 'Selected field',
        optional: false,
      },
    },
  },
};

export const alertsGroupingTakeActionEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AlertsGroupingTakeAction,
  schema: {
    tableId: {
      type: 'keyword',
      _meta: {
        description: 'Table ID',
        optional: false,
      },
    },
    groupNumber: {
      type: 'integer',
      _meta: {
        description: 'Group number',
        optional: false,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description: 'Alert status',
        optional: false,
      },
    },
    groupByField: {
      type: 'keyword',
      _meta: {
        description: 'Selected field',
        optional: false,
      },
    },
  },
};
