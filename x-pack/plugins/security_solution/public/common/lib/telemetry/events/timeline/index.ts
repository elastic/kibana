/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

const baseTimelineTelemetryEventSchema: TelemetryEvent['schema'] = {
  tab: {
    type: 'keyword',
    _meta: {
      description: 'Tab name (query|eql|esql|pinned|notes|graph|session)',
      optional: true,
    },
  },
  timelineType: {
    type: 'keyword',
    _meta: {
      description: 'Timeline type (default|template)',
      optional: true,
    },
  },
};

// Navigating to and within timeline
export const investigateInTimelineEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.InvestigateInTimeline,
  schema: {
    ...baseTimelineTelemetryEventSchema,
    openedFrom: {
      type: 'keyword',
      _meta: {
        description: 'Page with the active timeline',
        optional: false,
      },
    },
    dataProviderCount: {
      type: 'integer',
      _meta: {
        description: 'Active data providers count',
        optional: true,
      },
    },
    timelineRuleType: {
      type: 'keyword',
      _meta: {
        description: 'Rule type for alert investigated in timeline',
        optional: true,
      },
    },
  },
};

export const bulkInvestigateInTimelineEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.BulkInvestigateInTimeline,
  schema: {
    ...investigateInTimelineEvent.schema,
    documentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of documents added to timeline',
        optional: false,
      },
    },
  },
};

export const timelineTabClicked: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesTabClicked,
  schema: {
    ...baseTimelineTelemetryEventSchema,
  },
};

// Timeline UI Interactions

export const timelineEventRendererToggled: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesEventRendererToggled,
  schema: {
    ...baseTimelineTelemetryEventSchema,
    eventRendererEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Current toggle state of the event renderer',
        optional: false,
      },
    },
  },
};

export const timelineQueryBuilderToggled: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesQueryBuilderToggled,
  schema: {
    ...baseTimelineTelemetryEventSchema,
    queryBuilderEnabled: {
      type: 'boolean',
      _meta: {
        description: 'Current toggle state of the query builder',
        optional: false,
      },
    },
    dataProviderCount: {
      type: 'integer',
      _meta: {
        description: 'Active data providers count',
        optional: false,
      },
    },
  },
};

export const timelineDocumentPinned: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesDocumentPinned,
  schema: {
    ...baseTimelineTelemetryEventSchema,
  },
};

export const timelineAddDocumentNote: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesAddDocumentNote,
  schema: {
    ...baseTimelineTelemetryEventSchema,
  },
};

// Timeline Queries

export const timelineTrackQueryRun: TelemetryEvent = {
  eventType: TelemetryEventTypes.TimelinesQueryRun,
  schema: {
    ...baseTimelineTelemetryEventSchema,
    duration: {
      type: 'long',
      _meta: {
        description: 'Query duration',
        optional: false,
      },
    },
    language: {
      type: 'keyword',
      _meta: {
        description: 'Query language (kql|lucene|eql|esql)',
        optional: false,
      },
    },
  },
};
