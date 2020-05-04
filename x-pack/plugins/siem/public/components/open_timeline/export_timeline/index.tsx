/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { DeleteTimelines } from '../types';

import { TimelineDownloader } from './export_timeline';
import { DeleteTimelineModalOverlay } from '../delete_timeline_modal';
import { exportSelectedTimeline } from '../../../containers/timeline/api';

export interface ExportTimeline {
  disableExportTimelineDownloader: () => void;
  enableExportTimelineDownloader: () => void;
  isEnableDownloader: boolean;
}

export const useExportTimeline = (): ExportTimeline => {
  const [isEnableDownloader, setIsEnableDownloader] = useState(false);

  const enableExportTimelineDownloader = useCallback(() => {
    setIsEnableDownloader(true);
  }, []);

  const disableExportTimelineDownloader = useCallback(() => {
    setIsEnableDownloader(false);
  }, []);

  return {
    disableExportTimelineDownloader,
    enableExportTimelineDownloader,
    isEnableDownloader,
  };
};

const EditTimelineActionsComponent: React.FC<{
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
      exportedIds={ids}
      getExportedData={exportSelectedTimeline}
      isEnableDownloader={isEnableDownloader}
      onComplete={onComplete}
    />
    {deleteTimelines != null && (
      <DeleteTimelineModalOverlay
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
export const EditOneTimelineAction = React.memo(EditTimelineActionsComponent);
