/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiContextMenuPanel, EuiContextMenuItem, EuiBasicTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { TimelineStatus } from '../../../../common/types/timeline';

import * as i18n from './translations';
import { DeleteTimelines, OpenTimelineResult } from './types';
import { EditTimelineActions } from './export_timeline';
import { useEditTimelineActions } from './edit_timeline_actions';

const getExportedIds = (selectedTimelines: OpenTimelineResult[]) => {
  const array = Array.isArray(selectedTimelines) ? selectedTimelines : [selectedTimelines];
  return array.reduce(
    (acc, item) => (item.savedObjectId != null ? [...acc, item.savedObjectId] : [...acc]),
    [] as string[]
  );
};

export const useEditTimelineBatchActions = ({
  deleteTimelines,
  selectedItems,
  tableRef,
}: {
  deleteTimelines?: DeleteTimelines;
  selectedItems?: OpenTimelineResult[];
  tableRef: React.MutableRefObject<EuiBasicTable<OpenTimelineResult> | undefined>;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disableExportTimelineDownloader, onCloseDeleteTimelineModal, tableRef.current]
  );

  const selectedIds = useMemo(() => getExportedIds(selectedItems ?? []), [selectedItems]);

  const handleEnableExportTimelineDownloader = useCallback(() => enableExportTimelineDownloader(), [
    enableExportTimelineDownloader,
  ]);

  const handleOnOpenDeleteTimelineModal = useCallback(() => onOpenDeleteTimelineModal(), [
    onOpenDeleteTimelineModal,
  ]);

  const getBatchItemsPopoverContent = useCallback(
    (closePopover: () => void) => {
      const disabled = selectedItems?.some((item) => item.status === TimelineStatus.immutable);
      return (
        <>
          <EditTimelineActions
            deleteTimelines={deleteTimelines}
            ids={selectedIds}
            isEnableDownloader={isEnableDownloader}
            isDeleteTimelineModalOpen={isDeleteTimelineModalOpen}
            onComplete={onCompleteBatchActions.bind(null, closePopover)}
            title={
              selectedItems?.length !== 1
                ? i18n.SELECTED_TIMELINES(selectedItems?.length ?? 0)
                : selectedItems[0]?.title ?? ''
            }
          />

          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                disabled={disabled}
                icon="exportAction"
                key="ExportItemKey"
                onClick={handleEnableExportTimelineDownloader}
              >
                {i18n.EXPORT_SELECTED}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                disabled={disabled}
                icon="trash"
                key="DeleteItemKey"
                onClick={handleOnOpenDeleteTimelineModal}
              >
                {i18n.DELETE_SELECTED}
              </EuiContextMenuItem>,
            ]}
          />
        </>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      deleteTimelines,
      isEnableDownloader,
      isDeleteTimelineModalOpen,
      selectedIds,
      selectedItems,
      handleEnableExportTimelineDownloader,
      handleOnOpenDeleteTimelineModal,
      onCompleteBatchActions,
    ]
  );
  return { onCompleteBatchActions, getBatchItemsPopoverContent };
};
