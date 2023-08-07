/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TelemetryEventTypes } from '../../constants';
import type {
  DataQualityTelemetryCheckAllClickedEvent,
  DataQualityTelemetryIndexCheckedEvent,
} from '../../types';

export const dataQualityIndexCheckedEvent: DataQualityTelemetryIndexCheckedEvent = {
  eventType: TelemetryEventTypes.DataQualityIndexChecked,
  schema: {
    pattern: {
      type: 'keyword',
      _meta: {
        description: 'Index pattern',
        optional: false,
      },
    },
    indexName: {
      type: 'keyword',
      _meta: {
        description: 'Index name',
        optional: false,
      },
    },
    numberOfIndices: {
      type: 'integer',
      _meta: {
        description: 'Number of indices',
        optional: true,
      },
    },
    timeConsumedMs: {
      type: 'integer',
      _meta: {
        description: 'Time consumed in milliseconds',
        optional: true,
      },
    },
    ecsVersion: {
      type: 'keyword',
      _meta: {
        description: 'ECS version',
        optional: true,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
    numberOfIncompatibleFields: {
      type: 'integer',
      _meta: {
        description: 'Number of incompatible fields',
        optional: true,
      },
    },
    numberOfDocuments: {
      type: 'integer',
      _meta: {
        description: 'Number of documents',
        optional: true,
      },
    },
    sizeInBytes: {
      type: 'integer',
      _meta: {
        description: 'Size in bytes',
        optional: true,
      },
    },
    isCheckAll: {
      type: 'boolean',
      _meta: {
        description: 'Is triggered by check all button',
        optional: true,
      },
    },
  },
};

export const dataQualityCheckAllClickedEvent: DataQualityTelemetryCheckAllClickedEvent = {
  eventType: TelemetryEventTypes.DataQualityCheckAllClicked,
  schema: {
    numberOfIndices: {
      type: 'integer',
      _meta: {
        description: 'Number of indices',
        optional: true,
      },
    },
    numberOfIndicesChecked: {
      type: 'integer',
      _meta: {
        description: 'Number of indices checked',
        optional: true,
      },
    },
    timeConsumedMs: {
      type: 'integer',
      _meta: {
        description: 'Time consumed in milliseconds',
        optional: true,
      },
    },
    ecsVersion: {
      type: 'keyword',
      _meta: {
        description: 'ECS version',
        optional: true,
      },
    },
    numberOfIncompatibleFields: {
      type: 'integer',
      _meta: {
        description: 'Number of incompatible fields',
        optional: true,
      },
    },
    numberOfDocuments: {
      type: 'integer',
      _meta: {
        description: 'Number of documents',
        optional: true,
      },
    },
    sizeInBytes: {
      type: 'integer',
      _meta: {
        description: 'Size in bytes',
        optional: true,
      },
    },
    isCheckAll: {
      type: 'boolean',
      _meta: {
        description: 'Is triggered by check all button',
        optional: true,
      },
    },
  },
};
