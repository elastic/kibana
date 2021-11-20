/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BulkError } from '../../../../detection_engine/routes/utils';

import { SavedTimeline } from '../../../../../../common/types/timeline';
import { HapiReadableStream } from '../../../../detection_engine/rules/types';
import { TimelineStatusActions } from '../../../utils/common';
import { NoteResult } from '../../../../../../common/types/timeline/note';

export type ImportedTimeline = SavedTimeline & {
  savedObjectId: string | null;
  version: string | null;
  pinnedEventIds: string[];
  globalNotes: NoteResult[];
  eventNotes: NoteResult[];
};

export type PromiseFromStreams = ImportedTimeline;

export interface ImportRegular {
  timeline_id: string;
  status_code: number;
  message?: string;
  action: TimelineStatusActions.createViaImport | TimelineStatusActions.updateViaImport;
}

export type ImportTimelineResponse = ImportRegular | BulkError;
export interface ImportTimelinesRequestParams {
  body: { file: HapiReadableStream };
}
