/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TelemetryEventTypes } from '../../constants';
import type {
  DataQualityTelemetryCheckAllCompletedEvent,
  DataQualityTelemetryIndexCheckedEvent,
} from '../../types';

export const dataQualityIndexCheckedEvent: DataQualityTelemetryIndexCheckedEvent = {
  eventType: TelemetryEventTypes.DataQualityIndexChecked,
  schema: {
    batchId: {
      type: 'keyword',
      _meta: {
        description: 'batch id',
        optional: false,
      },
    },
    indexId: {
      type: 'keyword',
      _meta: {
        description: 'Index uuid',
        optional: true,
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
    numberOfIndicesChecked: {
      type: 'integer',
      _meta: {
        description: 'Number of indices checked',
        optional: true,
      },
    },
    numberOfSameFamily: {
      type: 'integer',
      _meta: {
        description: 'Number of same family',
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
    errorCount: {
      type: 'integer',
      _meta: {
        description: 'Error count',
        optional: true,
      },
    },
    numberOfFields: {
      type: 'integer',
      _meta: {
        description: 'Total number of fields',
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
    numberOfEcsFields: {
      type: 'integer',
      _meta: {
        description: 'Number of ecs compatible fields',
        optional: true,
      },
    },
    numberOfCustomFields: {
      type: 'integer',
      _meta: {
        description: 'Number of custom fields',
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
    sameFamilyFields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Same Family fields',
        },
      },
    },
    unallowedMappingFields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Unallowed mapping fields',
        },
      },
    },
    unallowedValueFields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Unallowed value fields',
        },
      },
    },
    ilmPhase: {
      type: 'keyword',
      _meta: {
        description: 'ILM phase',
        optional: true,
      },
    },
  },
};

export const dataQualityCheckAllClickedEvent: DataQualityTelemetryCheckAllCompletedEvent = {
  eventType: TelemetryEventTypes.DataQualityCheckAllCompleted,
  schema: {
    batchId: {
      type: 'keyword',
      _meta: {
        description: 'batch id',
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
    numberOfIndicesChecked: {
      type: 'integer',
      _meta: {
        description: 'Number of indices checked',
        optional: true,
      },
    },
    numberOfSameFamily: {
      type: 'integer',
      _meta: {
        description: 'Number of same family',
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
    numberOfFields: {
      type: 'integer',
      _meta: {
        description: 'Total number of fields',
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
    numberOfEcsFields: {
      type: 'integer',
      _meta: {
        description: 'Number of ecs compatible fields',
        optional: true,
      },
    },
    numberOfCustomFields: {
      type: 'integer',
      _meta: {
        description: 'Number of custom fields',
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
