/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TelemetryEventTypes } from '../../constants';
import type { TelemetryEvent } from '../../types';

export const dataQualityCheckedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.DataQualityChecked,
  schema: {
    numberOfIndices: {
      type: 'integer',
      _meta: {
        description: 'Number of indices checked',
        optional: false,
      },
    },
    timeConsumedMs: {
      type: 'integer',
      _meta: {
        description: 'Time consumed in milliseconds',
        optional: false,
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
        optional: false,
      },
    },
    incompatibleFields: {
      type: 'array',
      _meta: {
        description: 'List of incompatible fields',
        optional: true,
      },
      items: {
        properties: {
          type: {
            type: 'keyword',
            _meta: {
              description: 'Field type',
              optional: true,
            },
          },
          field: {
            type: 'keyword',
            _meta: {
              description: 'Field name',
              optional: true,
            },
          },
          value: {
            type: 'keyword',
            _meta: {
              description: 'Field value',
              optional: true,
            },
          },
        },
      },
    },
    numberOfDocuments: {
      type: 'integer',
      _meta: {
        description: 'Number of documents',
        optional: false,
      },
    },
    sizeInBytes: {
      type: 'integer',
      _meta: {
        description: 'Size in bytes',
        optional: false,
      },
    },
  },
};
