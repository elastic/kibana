/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DeleteTimelines } from '../types';

import { TimelineDownloader } from './export_timeline';
import { DeleteTimelineModalOverlay } from '../delete_timeline_modal';

export interface ExportTimeline {
  disableExportTimelineDownloader: () => void;
  enableExportTimelineDownloader: () => void;
  isEnableDownloader: boolean;
}

export const EditTimelineActionsComponent = (
  {
    deleteTimelines,
    ids,
    savedSearchIds,
    isEnableDownloader,
    isDeleteTimelineModalOpen,
    onComplete,
    title
  }: {
    deleteTimelines: DeleteTimelines | undefined;
    ids: string[];
    savedSearchIds?: string[];
    isEnableDownloader: boolean;
    isDeleteTimelineModalOpen: boolean;
    onComplete: () => void;
    title: string;
  }
) => (<>
  <TimelineDownloader
    data-test-subj="TimelineDownloader"
    exportedIds={ids}
    isEnableDownloader={isEnableDownloader}
    onComplete={onComplete}
  />
  {deleteTimelines != null && (
    <DeleteTimelineModalOverlay
      data-test-subj="DeleteTimelineModalOverlay"
      deleteTimelines={deleteTimelines}
      isModalOpen={isDeleteTimelineModalOpen}
      onComplete={onComplete}
      savedObjectIds={ids}
      savedSearchIds={savedSearchIds}
      title={title}
    />
  )}
</>);

export const EditTimelineActions = React.memo(EditTimelineActionsComponent);
