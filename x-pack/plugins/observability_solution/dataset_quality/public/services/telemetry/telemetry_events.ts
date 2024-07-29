/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import { SchemaObject, SchemaValue } from '@kbn/ebt';
import {
  DatasetEbtFilter,
  DatasetEbtProps,
  DatasetNavigatedEbtProps,
  DatasetQualityTelemetryEvent,
  DatasetQualityTelemetryEventTypes,
} from './types';

const dataStreamSchema: SchemaObject<DatasetEbtProps['data_stream']> = {
  properties: {
    dataset: {
      type: 'keyword',
      _meta: {
        description: 'Data stream dataset name',
      },
    },
    namespace: {
      type: 'keyword',
      _meta: {
        description: 'Data stream namespace',
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description: 'Data stream type e.g. "logs", "metrics"',
      },
    },
  },
};

const privilegesSchema: SchemaObject<DatasetEbtProps['privileges']> = {
  properties: {
    can_monitor_data_stream: {
      type: 'boolean',
      _meta: {
        description: 'Whether user can monitor the data stream',
      },
    },
    can_view_integrations: {
      type: 'boolean',
      _meta: {
        description: 'Whether user can view integrations',
      },
    },
    can_view_dashboards: {
      type: 'boolean',
      _meta: {
        description: 'Whether user can view dashboards',
        optional: true,
      },
    },
  },
};

const ebtFilterObjectSchema: SchemaObject<DatasetEbtFilter> = {
  properties: {
    total: {
      type: 'short',
      _meta: {
        description: 'Total number of values available to filter',
        optional: false,
      },
    },
    included: {
      type: 'short',
      _meta: {
        description: 'Number of values selected to filter for',
        optional: false,
      },
    },
    excluded: {
      type: 'short',
      _meta: {
        description: 'Number of values selected to filter out',
        optional: false,
      },
    },
  },
  _meta: {
    description: 'Represents the multi select filters',
    optional: false,
  },
};

const sortSchema: SchemaObject<DatasetNavigatedEbtProps['sort']> = {
  properties: {
    field: {
      type: 'keyword',
      _meta: {
        description: 'Field used for sorting on the main table',
        optional: false,
      },
    },
    direction: {
      type: 'keyword',
      _meta: {
        description: 'Sort direction',
        optional: false,
      },
    },
  },
  _meta: {
    description: 'Represents the state of applied sorting on the dataset quality home page',
    optional: false,
  },
};

const filtersSchema: SchemaObject<DatasetNavigatedEbtProps['filters']> = {
  properties: {
    is_degraded: {
      type: 'boolean',
      _meta: {
        description: 'Whether _ignored filter is applied',
        optional: false,
      },
    },
    query_length: {
      type: 'short',
      _meta: {
        description: 'Length of the query string',
        optional: false,
      },
    },
    integrations: ebtFilterObjectSchema,
    namespaces: ebtFilterObjectSchema,
    qualities: ebtFilterObjectSchema,
  },
  _meta: {
    description: 'Represents the state of applied filters on the dataset quality home page',
    optional: false,
  },
};

const datasetCommonSchema = {
  index_name: {
    type: 'keyword',
    _meta: {
      description: 'Index name',
    },
  } as SchemaValue<string>,
  data_stream: dataStreamSchema,
  privileges: privilegesSchema,
  data_stream_health: {
    type: 'keyword',
    _meta: {
      description: 'Quality of the data stream e.g. "good", "degraded", "poor"',
    },
  } as SchemaValue<string>,
  data_stream_aggregatable: {
    type: 'boolean',
    _meta: {
      description: 'Whether data stream is aggregatable against _ignored field',
    },
  } as SchemaValue<boolean>,
  degraded_percentage: {
    type: 'float',
    _meta: {
      description: 'Percentage of degraded documents in the data stream',
    },
  } as SchemaValue<number>,
  from: {
    type: 'date',
    _meta: {
      description: 'Start of the time range ISO8601 formatted string',
    },
  } as SchemaValue<string>,
  to: {
    type: 'date',
    _meta: {
      description: 'End of the time range ISO8601 formatted string',
    },
  } as SchemaValue<string>,
  integration: {
    type: 'keyword',
    _meta: {
      description: 'Integration name, if any',
      optional: true,
    },
  } as SchemaValue<string | undefined>,
};

const datasetNavigatedEventType: DatasetQualityTelemetryEvent = {
  eventType: DatasetQualityTelemetryEventTypes.NAVIGATED,
  schema: {
    ...datasetCommonSchema,
    sort: sortSchema,
    filters: filtersSchema,
  },
};

const datasetDetailsOpenedEventType: DatasetQualityTelemetryEvent = {
  eventType: DatasetQualityTelemetryEventTypes.DETAILS_OPENED,
  schema: {
    ...datasetCommonSchema,
    tracking_id: {
      type: 'keyword',
      _meta: {
        description: `Locally generated session tracking ID for funnel analysis`,
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration in milliseconds to load the dataset details page',
      },
    },
    breakdown_field: {
      type: 'keyword',
      _meta: {
        description: 'Field used for chart breakdown, if any',
        optional: true,
      },
    },
  },
};

const datasetDetailsNavigatedEventType: DatasetQualityTelemetryEvent = {
  eventType: DatasetQualityTelemetryEventTypes.DETAILS_NAVIGATED,
  schema: {
    ...omit(datasetDetailsOpenedEventType.schema, 'duration'),
    filters: {
      properties: {
        is_degraded: {
          type: 'boolean',
          _meta: {
            description: 'Whether _ignored filter is applied to the link',
            optional: false,
          },
        },
      },
    },
    target: {
      type: 'keyword',
      _meta: {
        description: 'Action that user took to navigate away from the dataset details page',
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Section of dataset details page the action is originated from e.g. header, summary, chart or table etc.',
      },
    },
  },
};

const datasetDetailsBreakdownFieldChangedEventType: DatasetQualityTelemetryEvent = {
  eventType: DatasetQualityTelemetryEventTypes.BREAKDOWN_FIELD_CHANGED,
  schema: {
    ...datasetCommonSchema,
    tracking_id: {
      type: 'keyword',
      _meta: {
        description: `Locally generated session tracking ID for funnel analysis`,
      },
    },
    breakdown_field: {
      type: 'keyword',
      _meta: {
        description: 'Field used for chart breakdown, if any',
        optional: true,
      },
    },
  },
};

export const datasetQualityEbtEvents = {
  datasetNavigatedEventType,
  datasetDetailsOpenedEventType,
  datasetDetailsNavigatedEventType,
  datasetDetailsBreakdownFieldChangedEventType,
};
