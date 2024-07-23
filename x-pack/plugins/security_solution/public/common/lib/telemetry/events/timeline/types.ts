/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

interface TimelinesTelemetryParams {
  timelineType?: 'default' | 'template';
  tab?: 'query' | 'eql' | 'esql' | 'pinned' | 'notes' | 'graph' | 'session' | 'securityAssistant';
}

// Track navigating to and within a timeline
export interface ReportInvestigateInTimelineParams extends TimelinesTelemetryParams {
  dataProviderCount?: number;
  openedFrom: string;
  timelineRuleType?: string;
}

export interface ReportBulkInvestigateInTimelineParams extends ReportInvestigateInTimelineParams {
  documentCount: number;
}

// Todo: remove as this may not be necessary with default ebt click tracking...
export type ReportTimelinesTabClickedParams = TimelinesTelemetryParams;

// Track UI Interactions

export interface ReportTimelinesEventRendererToggledParams extends TimelinesTelemetryParams {
  eventRendererEnabled: boolean;
}

export interface ReportTimelinesQueryBuilderToggledParams extends TimelinesTelemetryParams {
  queryBuilderEnabled: boolean;
  dataProviderCount: number;
}

export type ReportTimelinesDocumentPinnedParams = TimelinesTelemetryParams;

export type ReportTimelinesAddDocumentNoteParams = TimelinesTelemetryParams;

// Track timeline queries and performance
export interface ReportTimelinesQueryRunParams extends TimelinesTelemetryParams {
  language: 'lucene' | 'kuery' | 'eql' | 'esql';
  duration: number;
}

export type ReportTimelinesTelemetryEventParams =
  | ReportInvestigateInTimelineParams
  | ReportBulkInvestigateInTimelineParams
  | ReportTimelinesTabClickedParams
  | ReportTimelinesEventRendererToggledParams
  | ReportTimelinesQueryBuilderToggledParams
  | ReportTimelinesDocumentPinnedParams
  | ReportTimelinesAddDocumentNoteParams
  | ReportTimelinesQueryRunParams

export type TimelinesTelemetryEvent =
  | {
      eventType: TelemetryEventTypes.InvestigateInTimeline;
      schema: RootSchema<ReportInvestigateInTimelineParams>;
    }
  | {
      eventType: TelemetryEventTypes.BulkInvestigateInTimeline;
      schema: RootSchema<ReportBulkInvestigateInTimelineParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesTabClicked;
      schema: RootSchema<ReportTimelinesTabClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesEventRendererToggled;
      schema: RootSchema<ReportTimelinesEventRendererToggledParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesQueryBuilderToggled;
      schema: RootSchema<ReportTimelinesQueryBuilderToggledParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesDocumentPinned;
      schema: RootSchema<ReportTimelinesDocumentPinnedParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesAddDocumentNote;
      schema: RootSchema<ReportTimelinesAddDocumentNoteParams>;
    }
  | {
      eventType: TelemetryEventTypes.TimelinesQueryRun;
      schema: RootSchema<ReportTimelinesQueryRunParams>;
    };
