/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DeleteTimelines } from '../types';

import { TimelineDownloader } from './export_timeline';
import { DeleteTimelineModalOverlay } from '../delete_timeline_modal';

export interface ExportTimeline {
  disableExportTimelineDownloader: () => void;
  enableExportTimelineDownloader: () => void;
  isEnableDownloader: boolean;
}

export const EditTimelineActionsComponent: React.FC<{
  deleteTimelines: DeleteTimelines | undefined;
  ids: string[];
  isEnableDownloader: boolean;
  isDeleteTimelineModalOpen: boolean;
  onComplete: () => void;
  title: string;
}> = ({
  deleteTimelines,
  ids,
  isEnableDownloader,
  isDeleteTimelineModalOpen,
  onComplete,
  title,
}) => (
  <>
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
        title={title}
      />
    )}
  </>
);

export const EditTimelineActions = React.memo(EditTimelineActionsComponent);
