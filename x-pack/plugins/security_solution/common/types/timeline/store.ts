/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineExpandedDetail } from '.';
import { Filter } from '../../../../../../src/plugins/data/public';
import { DataProvider } from '../../../public/timelines/components/timeline/data_providers/data_provider';
import { Direction, RowRendererId } from '../../search_strategy';

export interface SortColumnTimeline {
  columnId: string;
  columnType: string;
  sortDirection: 'none' | Direction;
}

export interface TimelineInput {
  id: string;
  dataProviders?: DataProvider[];
  dateRange?: {
    start: string;
    end: string;
  };
  excludedRowRendererIds?: RowRendererId[];
  expandedDetail?: TimelineExpandedDetail;
  filters?: Filter[];
  columns: ColumnHeaderOptions[];
  itemsPerPage?: number;
  indexNames: string[];
  kqlQuery?: {
    filterQuery: SerializedFilterQuery | null;
  };
  show?: boolean;
  sort?: Sort[];
  showCheckboxes?: boolean;
  timelineType?: TimelineTypeLiteral;
  templateTimelineId?: string | null;
  templateTimelineVersion?: number | null;
}
