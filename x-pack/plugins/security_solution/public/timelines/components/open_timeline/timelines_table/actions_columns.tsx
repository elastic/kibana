/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import {
  ActionTimelineToShow,
  DeleteTimelines,
  EnableExportTimelineDownloader,
  OnOpenTimeline,
  OpenTimelineResult,
  OnOpenDeleteTimelineModal,
  TimelineActionsOverflowColumns,
} from '../types';
import * as i18n from '../translations';
import { TimelineStatus } from '../../../../../common/types/timeline';

/**
 * Returns the action columns (e.g. delete, open duplicate timeline)
 */
export const getActionsColumns = ({
  actionTimelineToShow,
  deleteTimelines,
  enableExportTimelineDownloader,
  onOpenDeleteTimelineModal,
  onOpenTimeline,
}: {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
}): [TimelineActionsOverflowColumns] => {
  const openAsDuplicateColumn = {
    name: i18n.OPEN_AS_DUPLICATE,
    icon: 'copy',
    onClick: ({ savedObjectId }: OpenTimelineResult) => {
      onOpenTimeline({
        duplicate: true,
        timelineId: savedObjectId ?? '',
      });
    },
    type: 'icon',
    enabled: ({ savedObjectId }: OpenTimelineResult) => savedObjectId != null,
    description: i18n.OPEN_AS_DUPLICATE,
    'data-test-subj': 'open-duplicate',
  };

  const exportTimelineAction = {
    name: i18n.EXPORT_SELECTED,
    icon: 'exportAction',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (enableExportTimelineDownloader != null) enableExportTimelineDownloader(selectedTimeline);
    },
    enabled: (timeline: OpenTimelineResult) => {
      return timeline.savedObjectId != null && timeline.status !== TimelineStatus.immutable;
    },
    description: i18n.EXPORT_SELECTED,
    'data-test-subj': 'export-timeline',
  };

  const deleteTimelineColumn = {
    name: i18n.DELETE_SELECTED,
    icon: 'trash',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (onOpenDeleteTimelineModal != null) onOpenDeleteTimelineModal(selectedTimeline);
    },
    enabled: ({ savedObjectId, status }: OpenTimelineResult) =>
      savedObjectId != null && status !== TimelineStatus.immutable,
    description: i18n.DELETE_SELECTED,
    'data-test-subj': 'delete-timeline',
  };

  return [
    {
      width: '40px',
      actions: [
        actionTimelineToShow.includes('duplicate') ? openAsDuplicateColumn : null,
        actionTimelineToShow.includes('export') ? exportTimelineAction : null,
        actionTimelineToShow.includes('delete') && deleteTimelines != null
          ? deleteTimelineColumn
          : null,
      ].filter((action) => action != null),
    },
  ];
};
