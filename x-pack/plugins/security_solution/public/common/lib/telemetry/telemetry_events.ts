/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryEvent } from './types';
import { TelemetryEventTypes } from './types';

const alertsGroupingToggledEvent: TelemetryEvent = {
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
      type: 'text',
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
    groupName: {
      type: 'keyword',
      _meta: {
        description: 'Group value',
        optional: true,
      },
    },
  },
};

const alertsGroupingChangedEvent: TelemetryEvent = {
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

const alertsGroupingTakeActionEvent: TelemetryEvent = {
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

const entityClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityDetailsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

const entityAlertsClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityAlertsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

const entityRiskFilteredEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityRiskFiltered,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
    selectedSeverity: {
      type: 'keyword',
      _meta: {
        description: 'Selected severity (Unknown|Low|Moderate|High|Critical)',
        optional: false,
      },
    },
  },
};

const mlJobUpdateEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.MLJobUpdate,
  schema: {
    jobId: {
      type: 'keyword',
      _meta: {
        description: 'Job id',
        optional: false,
      },
    },
    isElasticJob: {
      type: 'boolean',
      _meta: {
        description: 'If true the job is one of the pre-configure security solution modules',
        optional: false,
      },
    },
    moduleId: {
      type: 'keyword',
      _meta: {
        description: 'Module id',
        optional: true,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description: 'It describes what has changed in the job.',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
  },
};

export const telemetryEvents = [
  alertsGroupingToggledEvent,
  alertsGroupingChangedEvent,
  alertsGroupingTakeActionEvent,
  entityClickedEvent,
  entityAlertsClickedEvent,
  entityRiskFilteredEvent,
  mlJobUpdateEvent,
];
