/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RowRendererId, Sort, TimelineStatus } from '@kbn/timelines-plugin/common/types';
import type { FavoriteTimelineResult } from '../../../public/timelines/components/open_timeline/types';

import type { Maybe } from '../../search_strategy';

import type {
  ColumnHeaderResult,
  DataProviderResult,
  DateRangePickerResult,
  EqlOptionsResult,
  FilterTimelineResult,
  SerializedFilterQueryResult,
  TimelineType,
} from '..';
import type { NoteResult } from './note';
import type { PinnedEvent } from './pinned_event';

export interface TimelineServerResponse {
  columns?: Maybe<ColumnHeaderResult[]>;
  created?: Maybe<number>;
  createdBy?: Maybe<string>;
  dataProviders?: Maybe<DataProviderResult[]>;
  dataViewId?: Maybe<string>;
  dateRange?: Maybe<DateRangePickerResult>;
  description?: Maybe<string>;
  eqlOptions?: Maybe<EqlOptionsResult>;
  eventIdToNoteIds?: Maybe<NoteResult[]>;
  eventType?: Maybe<string>;
  excludedRowRendererIds?: Maybe<RowRendererId[]>;
  favorite?: Maybe<FavoriteTimelineResult[]>;
  filters?: Maybe<FilterTimelineResult[]>;
  kqlMode?: Maybe<string>;
  kqlQuery?: Maybe<SerializedFilterQueryResult>;
  indexNames?: Maybe<string[]>;
  notes?: Maybe<NoteResult[]>;
  noteIds?: Maybe<string[]>;
  pinnedEventIds?: Maybe<string[]>;
  pinnedEventsSaveObject?: Maybe<PinnedEvent[]>;
  savedQueryId?: Maybe<string>;
  savedObjectId: string;
  sort?: Maybe<Sort>;
  status?: Maybe<TimelineStatus>;
  title?: Maybe<string>;
  templateTimelineId?: Maybe<string>;
  templateTimelineVersion?: Maybe<number>;
  timelineType?: Maybe<TimelineType>;
  updated?: Maybe<number>;
  updatedBy?: Maybe<string>;
  version: string;
}
