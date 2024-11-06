/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataProviderType } from './components.gen';
import {
  BareNote,
  BarePinnedEvent,
  ColumnHeaderResult,
  DataProviderTypeEnum,
  DataProviderResult,
  FavoriteTimelineResponse,
  FilterTimelineResult,
  ImportTimelineResult,
  ImportTimelines,
  type Note,
  PinnedEvent,
  PersistTimelineResponse,
  QueryMatchResult,
  ResolvedTimeline,
  RowRendererId,
  RowRendererIdEnum,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
  Sort,
  SortDirection,
  SortFieldTimeline,
  SortFieldTimelineEnum,
  TemplateTimelineType,
  TemplateTimelineTypeEnum,
  TimelineErrorResponse,
  TimelineResponse,
  TimelineSavedToReturnObject,
  TimelineStatus,
  TimelineStatusEnum,
  TimelineType,
  TimelineTypeEnum,
} from './components.gen';

export {
  BareNote,
  BarePinnedEvent,
  ColumnHeaderResult,
  DataProviderResult,
  DataProviderType,
  DataProviderTypeEnum,
  FavoriteTimelineResponse,
  FilterTimelineResult,
  ImportTimelineResult,
  ImportTimelines,
  Note,
  PinnedEvent,
  PersistTimelineResponse,
  QueryMatchResult,
  ResolvedTimeline,
  RowRendererId,
  RowRendererIdEnum,
  SavedTimeline,
  SavedTimelineWithSavedObjectId,
  Sort,
  SortDirection,
  SortFieldTimeline,
  SortFieldTimelineEnum,
  TemplateTimelineType,
  TimelineErrorResponse,
  TimelineResponse,
  TemplateTimelineTypeEnum,
  TimelineSavedToReturnObject,
  TimelineStatus,
  TimelineStatusEnum,
  TimelineType,
  TimelineTypeEnum,
};

/**
 * This type represents a timeline type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type TimelineWithoutExternalRefs = Omit<SavedTimeline, 'dataViewId' | 'savedQueryId'>;

export type BarePinnedEventWithoutExternalRefs = Omit<BarePinnedEvent, 'timelineId'>;

/**
 * This type represents a note type stored in a saved object that does not include any fields that reference
 * other saved objects.
 */
export type BareNoteWithoutExternalRefs = Omit<BareNote, 'timelineId'>;

export const RowRendererCount = Object.keys(RowRendererIdEnum).length;
export const RowRendererValues = Object.values(RowRendererId.Values);

/**
 * Import/export timelines
 */

export type ExportedGlobalNotes = Array<Exclude<Note, 'eventId'>>;
export type ExportedEventNotes = Note[];

export interface ExportedNotes {
  eventNotes: ExportedEventNotes;
  globalNotes: ExportedGlobalNotes;
}

export interface ExportTimelineNotFoundError {
  statusCode: number;
  message: string;
}

export interface PageInfoTimeline {
  pageIndex: number;
  pageSize: number;
}

export interface SortTimeline {
  sortField: SortFieldTimeline;
  sortOrder: SortDirection;
}
