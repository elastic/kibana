/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';
import { OpenTimelineResult } from './types';

export const useEditTimelineActions = () => {
  const [actionItem, setActionTimeline] = useState<null | OpenTimelineResult>(null);
  const [isDeleteTimelineModalOpen, setIsDeleteTimelineModalOpen] = useState<boolean>(false);
  const [isEnableDownloader, setIsEnableDownloader] = useState(false);

  // Handle Delete Modal
  const onCloseDeleteTimelineModal = useCallback(() => {
    setIsDeleteTimelineModalOpen(false);
    setActionTimeline(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionItem]);

  const onOpenDeleteTimelineModal = useCallback((selectedActionItem?: OpenTimelineResult) => {
    setIsDeleteTimelineModalOpen(true);
    if (selectedActionItem != null) {
      setActionTimeline(selectedActionItem);
    }
  }, []);

  // Handle Downloader Modal
  const enableExportTimelineDownloader = useCallback((selectedActionItem?: OpenTimelineResult) => {
    setIsEnableDownloader(true);
    if (selectedActionItem != null) {
      setActionTimeline(selectedActionItem);
    }
  }, []);

  const disableExportTimelineDownloader = useCallback(() => {
    setIsEnableDownloader(false);
    setActionTimeline(null);
  }, []);

  // On Compete every tasks
  const onCompleteEditTimelineAction = useCallback(() => {
    setIsDeleteTimelineModalOpen(false);
    setIsEnableDownloader(false);
    setActionTimeline(null);
  }, []);

  return {
    actionItem,
    onCompleteEditTimelineAction,
    isDeleteTimelineModalOpen,
    onCloseDeleteTimelineModal,
    onOpenDeleteTimelineModal,
    isEnableDownloader,
    enableExportTimelineDownloader,
    disableExportTimelineDownloader,
  };
};
