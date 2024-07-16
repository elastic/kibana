/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTable } from '@elastic/eui';
import { EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { TimelineType } from '../../../../common/api/timeline';

import * as i18n from './translations';
import type { DeleteTimelines, OpenTimelineResult } from './types';
import { EditTimelineActions } from './export_timeline';
import { useEditTimelineActions } from './edit_timeline_actions';
import { getSelectedTimelineIdsAndSearchIds, getRequestIds } from '.';

export const useEditTimelineBatchActions = ({
  deleteTimelines,
  selectedItems,
  tableRef,
  timelineType = TimelineType.default,
}: {
  deleteTimelines?: DeleteTimelines;
  selectedItems?: OpenTimelineResult[];
  tableRef: React.MutableRefObject<EuiBasicTable<OpenTimelineResult> | null>;
  timelineType: TimelineType | null;
}) => {
  const {
    enableExportTimelineDownloader,
    disableExportTimelineDownloader,
    isEnableDownloader,
    isDeleteTimelineModalOpen,
    onOpenDeleteTimelineModal,
    onCloseDeleteTimelineModal,
  } = useEditTimelineActions();

  const onCompleteBatchActions = useCallback(
    (closePopover?: () => void) => {
      if (closePopover != null) closePopover();
      if (tableRef != null && tableRef.current != null) {
        tableRef.current.changeSelection([]);
      }
      disableExportTimelineDownloader();
      onCloseDeleteTimelineModal();
    },
    [disableExportTimelineDownloader, onCloseDeleteTimelineModal, tableRef]
  );

  const { timelineIds, searchIds } = useMemo(() => {
    if (selectedItems != null) {
      return getRequestIds(getSelectedTimelineIdsAndSearchIds(selectedItems));
    } else {
      return { timelineIds: [], searchIds: undefined };
    }
  }, [selectedItems]);

  const handleEnableExportTimelineDownloader = useCallback(
    () => enableExportTimelineDownloader(),
    [enableExportTimelineDownloader]
  );

  const handleOnOpenDeleteTimelineModal = useCallback(
    () => onOpenDeleteTimelineModal(),
    [onOpenDeleteTimelineModal]
  );

  const getBatchItemsPopoverContent = useCallback(
    (closePopover: () => void) => {
      const disabled = selectedItems == null || selectedItems.length === 0;
      const items = [];
      if (selectedItems) {
        items.push(
          <EuiContextMenuItem
            data-test-subj="export-timeline-action"
            disabled={disabled}
            icon="exportAction"
            key="ExportItemKey"
            onClick={handleEnableExportTimelineDownloader}
          >
            {i18n.EXPORT_SELECTED}
          </EuiContextMenuItem>
        );
      }
      if (deleteTimelines) {
        items.push(
          <EuiContextMenuItem
            data-test-subj="delete-timeline-action"
            disabled={disabled}
            icon="trash"
            key="DeleteItemKey"
            onClick={handleOnOpenDeleteTimelineModal}
          >
            {i18n.DELETE_SELECTED}
          </EuiContextMenuItem>
        );
      }
      return (
        <>
          <EditTimelineActions
            deleteTimelines={deleteTimelines}
            ids={timelineIds}
            savedSearchIds={searchIds}
            isEnableDownloader={isEnableDownloader}
            isDeleteTimelineModalOpen={isDeleteTimelineModalOpen}
            onComplete={onCompleteBatchActions.bind(null, closePopover)}
            title={
              selectedItems?.length !== 1
                ? timelineType === TimelineType.template
                  ? i18n.SELECTED_TEMPLATES(selectedItems?.length ?? 0)
                  : i18n.SELECTED_TIMELINES(selectedItems?.length ?? 0)
                : selectedItems[0]?.title ?? ''
            }
          />
          <EuiContextMenuPanel items={items} />
        </>
      );
    },
    [
      selectedItems,
      deleteTimelines,
      timelineIds,
      searchIds,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      onCompleteBatchActions,
      timelineType,
      handleEnableExportTimelineDownloader,
      handleOnOpenDeleteTimelineModal,
    ]
  );
  return { onCompleteBatchActions, getBatchItemsPopoverContent };
};
