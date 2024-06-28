/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { TimelineModel } from '../../store/model';

export interface TimelineDataGridCellContext {
  events: TimelineItem[];
  pinnedEventIds: TimelineModel['pinnedEventIds'];
  eventIdsAddingNotes: Set<string>;
  onToggleShowNotes: (eventId?: string) => void;
  eventIdToNoteIds: Record<string, string[]>;
  refetch: () => void;
}
