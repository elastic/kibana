/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, EventTypeOpts, RootSchema } from '@kbn/core/server';
import { EventType, FieldType } from '@kbn/reporting-server';

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.REPORT_ID]: {
    [FieldType.REPORT_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the report job, for correlating multiple events.',
      },
    },
  },
  [FieldType.EXPORT_TYPE]: {
    [FieldType.EXPORT_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of export format: CSV, PNG, PDF.',
      },
    },
  },
  [FieldType.OBJECT_TYPE]: {
    [FieldType.OBJECT_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of object being exported: Dashboard, Lens, Canvas, Search.',
      },
    },
  },
  [FieldType.IS_DEPRECATED]: {
    [FieldType.IS_DEPRECATED]: {
      type: 'boolean',
      _meta: {
        description: 'Whether the export type is deprecated.',
      },
    },
  },
  [FieldType.IS_PUBLIC_API]: {
    [FieldType.IS_PUBLIC_API]: {
      type: 'boolean',
      _meta: {
        description: 'Whether the public API was used to request the report, vs the internal API.',
      },
    },
  },
  [FieldType.DURATION_MS]: {
    [FieldType.DURATION_MS]: {
      type: 'long',
      _meta: {
        description: 'The number of milliseconds of time taken for the event from start to finish.',
      },
    },
  },
  [FieldType.ERROR_CODE]: {
    [FieldType.ERROR_CODE]: {
      type: 'keyword',
      _meta: {
        description: 'An indicator of a type of error.',
      },
    },
  },
  [FieldType.ERROR_MESSAGE]: {
    [FieldType.ERROR_MESSAGE]: {
      type: 'keyword',
      _meta: {
        description: 'A message from an error that was caught.',
      },
    },
  },
  [FieldType.BYTE_SIZE]: {
    [FieldType.BYTE_SIZE]: {
      type: 'long',
      _meta: {
        description: 'The size in bytes of the export.',
      },
    },
  },
  [FieldType.NUM_PAGES]: {
    [FieldType.NUM_PAGES]: {
      type: 'long',
      _meta: {
        description: 'The number of pages in a PDF export.',
      },
    },
  },
  [FieldType.SCREENSHOT_LAYOUT]: {
    [FieldType.SCREENSHOT_LAYOUT]: {
      type: 'keyword',
      _meta: {
        description: 'The type of layout used for PDF export: print, preserve, canvas',
      },
    },
  },
  [FieldType.SCREENSHOT_PIXELS]: {
    [FieldType.SCREENSHOT_PIXELS]: {
      type: 'long',
      _meta: {
        description: 'The number of pixels captured in the PNG or PDF export.',
      },
    },
  },
  [FieldType.CSV_ROWS]: {
    [FieldType.CSV_ROWS]: {
      type: 'long',
      _meta: {
        description: 'The number of rows exported in CSV.',
      },
    },
  },
  // TODO: not used
  [FieldType.CSV_COLUMNS]: {
    [FieldType.CSV_COLUMNS]: {
      type: 'long',
      _meta: {
        description: 'The number of columns exported in CSV.',
      },
    },
  },
};

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventType.REPORT_CREATION,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.IS_DEPRECATED],
      ...fields[FieldType.IS_PUBLIC_API],
    },
  },
  {
    eventType: EventType.REPORT_CLAIM,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
    },
  },
  {
    eventType: EventType.REPORT_COMPLETION_CSV,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
      ...fields[FieldType.BYTE_SIZE],
      ...fields[FieldType.CSV_ROWS],
      // ...fields[FieldType.CSV_COLUMNS], // TODO add to report output metrics
    },
  },
  {
    eventType: EventType.REPORT_COMPLETION_SCREENSHOT,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
      ...fields[FieldType.BYTE_SIZE],
      ...fields[FieldType.NUM_PAGES],
      ...fields[FieldType.SCREENSHOT_LAYOUT],
      ...fields[FieldType.SCREENSHOT_PIXELS],
    },
  },
  {
    eventType: EventType.REPORT_ERROR,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
      ...fields[FieldType.ERROR_CODE],
      ...fields[FieldType.ERROR_MESSAGE],
    },
  },
  {
    eventType: EventType.REPORT_DOWNLOAD,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
    },
  },
  {
    eventType: EventType.REPORT_DELETION,
    schema: {
      ...fields[FieldType.REPORT_ID],
      ...fields[FieldType.EXPORT_TYPE],
      ...fields[FieldType.OBJECT_TYPE],
      ...fields[FieldType.DURATION_MS],
    },
  },
];

export function registerReportingEventTypes(core: CoreSetup) {
  const { analytics } = core;
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
}
