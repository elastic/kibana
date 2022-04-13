/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { TimelineStatus, TimelineType } from '../../../../../common/types/timeline';

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
  const createTimelineFromTemplate = {
    name: i18n.CREATE_TIMELINE_FROM_TEMPLATE,
    icon: 'timeline',
    onClick: ({ savedObjectId }: OpenTimelineResult) => {
      onOpenTimeline({
        duplicate: true,
        timelineType: TimelineType.default,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        timelineId: savedObjectId!,
      });
    },
    type: 'icon',
    enabled: ({ savedObjectId }: OpenTimelineResult) => savedObjectId != null,
    description: i18n.CREATE_TIMELINE_FROM_TEMPLATE,
    'data-test-subj': 'create-from-template',
    available: (item: OpenTimelineResult) =>
      item.timelineType === TimelineType.template && actionTimelineToShow.includes('createFrom'),
  };

  const createTemplateFromTimeline = {
    name: i18n.CREATE_TEMPLATE_FROM_TIMELINE,
    icon: 'visText',
    onClick: ({ savedObjectId }: OpenTimelineResult) => {
      onOpenTimeline({
        duplicate: true,
        timelineType: TimelineType.template,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        timelineId: savedObjectId!,
      });
    },
    type: 'icon',
    enabled: ({ savedObjectId }: OpenTimelineResult) => savedObjectId != null,
    description: i18n.CREATE_TEMPLATE_FROM_TIMELINE,
    'data-test-subj': 'create-template-from-timeline',
    available: (item: OpenTimelineResult) =>
      item.timelineType !== TimelineType.template && actionTimelineToShow.includes('createFrom'),
  };

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
    available: (item: OpenTimelineResult) =>
      item.timelineType !== TimelineType.template && actionTimelineToShow.includes('duplicate'),
  };

  const openAsDuplicateTemplateColumn = {
    name: i18n.OPEN_AS_DUPLICATE_TEMPLATE,
    icon: 'copy',
    onClick: ({ savedObjectId }: OpenTimelineResult) => {
      onOpenTimeline({
        duplicate: true,
        timelineId: savedObjectId ?? '',
      });
    },
    type: 'icon',
    enabled: ({ savedObjectId }: OpenTimelineResult) => savedObjectId != null,
    description: i18n.OPEN_AS_DUPLICATE_TEMPLATE,
    'data-test-subj': 'open-duplicate-template',
    available: (item: OpenTimelineResult) =>
      item.timelineType === TimelineType.template && actionTimelineToShow.includes('duplicate'),
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
    available: () => actionTimelineToShow.includes('export'),
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
    available: () => actionTimelineToShow.includes('delete') && deleteTimelines != null,
  };

  return [
    {
      width: '80px',
      actions: [
        createTimelineFromTemplate,
        createTemplateFromTimeline,
        openAsDuplicateColumn,
        openAsDuplicateTemplateColumn,
        exportTimelineAction,
        deleteTimelineColumn,
      ],
    },
  ];
};
