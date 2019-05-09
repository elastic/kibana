/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeader } from '../../components/timeline/body/column_headers/column_header';
import { DataProvider } from '../../components/timeline/data_providers/data_provider';
import { DEFAULT_TIMELINE_WIDTH } from '../../components/timeline/body/helpers';
import { defaultHeaders } from '../../components/timeline/body/column_headers/default_headers';
import { Direction } from '../../graphql/types';
import { KueryFilterQuery, SerializedFilterQuery } from '../model';
import { Sort } from '../../components/timeline/body/sort';

export const DEFAULT_PAGE_COUNT = 2; // Eui Pager will not render unless this is a minimum of 2 pages
export type KqlMode = 'filter' | 'search';

export interface TimelineModel {
  /** The columns displayed in the timeline */
  columns: ColumnHeader[];
  /** The sources of the event data shown in the timeline */
  dataProviders: DataProvider[];
  /** A summary of the events and notes in this timeline */
  description: string;
  /** A map of events in this timeline to the chronologically ordered notes (in this timeline) associated with the event */
  eventIdToNoteIds: Record<string, string[]>;
  /** The chronological history of actions related to this timeline */
  historyIds: string[];
  /** The chronological history of actions related to this timeline */
  highlightedDropAndProviderId: string;
  /** Uniquely identifies the timeline */
  id: string;
  /** When true, this timeline was marked as "favorite" by the user */
  isFavorite: boolean;
  /** When true, the timeline will update as new data arrives */
  isLive: boolean;
  /** The number of items to show in a single page of results */
  itemsPerPage: number;
  /** Displays a series of choices that when selected, become the value of `itemsPerPage` */
  itemsPerPageOptions: number[];
  /** determines the behavior of the KQL bar */
  kqlMode: KqlMode;
  /** the KQL query in the KQL bar */
  kqlQuery: {
    filterQuery: SerializedFilterQuery | null;
    filterQueryDraft: KueryFilterQuery | null;
  };
  /** Title */
  title: string;
  /** Notes added to the timeline itself. Notes added to events are stored (separately) in `eventIdToNote` */
  noteIds: string[];
  /** Events pinned to this timeline */
  pinnedEventIds: Record<string, boolean>;
  /** Specifies the granularity of the date range (e.g. 1 Day / Week / Month) applicable to the mini-map */
  range: string;
  /** When true, show the timeline flyover */
  show: boolean;
  /**  Specifies which column the timeline is sorted on, and the direction (ascending / descending) */
  sort: Sort;
  /** Persists the UI state (width) of the timeline flyover */
  width: number;
}

export const timelineDefaults: Readonly<
  Pick<
    TimelineModel,
    | 'columns'
    | 'dataProviders'
    | 'description'
    | 'eventIdToNoteIds'
    | 'highlightedDropAndProviderId'
    | 'historyIds'
    | 'isFavorite'
    | 'isLive'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'kqlMode'
    | 'kqlQuery'
    | 'title'
    | 'noteIds'
    | 'pinnedEventIds'
    | 'range'
    | 'show'
    | 'sort'
    | 'width'
  >
> = {
  columns: defaultHeaders,
  dataProviders: [],
  description: '',
  eventIdToNoteIds: {},
  highlightedDropAndProviderId: '',
  historyIds: [],
  isFavorite: false,
  isLive: false,
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100],
  kqlMode: 'filter',
  kqlQuery: {
    filterQuery: null,
    filterQueryDraft: null,
  },
  title: '',
  noteIds: [],
  pinnedEventIds: {},
  range: '1 Day',
  show: false,
  sort: {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  },
  width: DEFAULT_TIMELINE_WIDTH,
};
