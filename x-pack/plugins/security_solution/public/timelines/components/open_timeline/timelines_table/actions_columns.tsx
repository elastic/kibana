/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICON_TYPES, EuiTableActionsColumnType } from '@elastic/eui';
import type {
  ActionTimelineToShow,
  DeleteTimelines,
  EnableExportTimelineDownloader,
  OnCreateRuleFromTimeline,
  OnOpenTimeline,
  OpenTimelineResult,
  OnOpenDeleteTimelineModal,
} from '../types';
import * as i18n from '../translations';
import { TimelineStatus, TimelineType } from '../../../../../common/api/timeline';

type Action = EuiTableActionsColumnType<object>['actions'][number];
/**
 * Returns the action columns (e.g. delete, open duplicate timeline)
 */
export const getActionsColumns = ({
  actionTimelineToShow,
  deleteTimelines,
  enableExportTimelineDownloader,
  onOpenDeleteTimelineModal,
  onOpenTimeline,
  onCreateRule,
  onCreateRuleFromEql,
  hasCrudAccess,
}: {
  actionTimelineToShow: ActionTimelineToShow[];
  deleteTimelines?: DeleteTimelines;
  enableExportTimelineDownloader?: EnableExportTimelineDownloader;
  onOpenDeleteTimelineModal?: OnOpenDeleteTimelineModal;
  onOpenTimeline: OnOpenTimeline;
  onCreateRule?: OnCreateRuleFromTimeline;
  onCreateRuleFromEql?: OnCreateRuleFromTimeline;
  hasCrudAccess: boolean;
}): Array<EuiTableActionsColumnType<object>> => {
  const createTimelineFromTemplate = {
    name: i18n.CREATE_TIMELINE_FROM_TEMPLATE,
    icon: 'timeline' as typeof ICON_TYPES[number],
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
  } as Action;

  const createTemplateFromTimeline = {
    name: i18n.CREATE_TEMPLATE_FROM_TIMELINE,
    icon: 'visText' as typeof ICON_TYPES[number],
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
  } as Action;

  const openAsDuplicateColumn = {
    name: i18n.OPEN_AS_DUPLICATE,
    icon: 'copy' as typeof ICON_TYPES[number],
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
  } as Action;

  const openAsDuplicateTemplateColumn = {
    name: i18n.OPEN_AS_DUPLICATE_TEMPLATE,
    icon: 'copy' as typeof ICON_TYPES[number],
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
  } as Action;

  const exportTimelineAction = {
    name: i18n.EXPORT_SELECTED,
    icon: 'exportAction' as typeof ICON_TYPES[number],
    type: 'icon',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (enableExportTimelineDownloader != null) enableExportTimelineDownloader(selectedTimeline);
    },
    enabled: (timeline: OpenTimelineResult) => {
      return timeline.savedObjectId != null && timeline.status !== TimelineStatus.immutable;
    },
    description: i18n.EXPORT_SELECTED,
    'data-test-subj': 'export-timeline',
    available: () => actionTimelineToShow.includes('export'),
  } as Action;

  const deleteTimelineColumn = {
    name: i18n.DELETE_SELECTED,
    icon: 'trash' as typeof ICON_TYPES[number],
    type: 'icon',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (onOpenDeleteTimelineModal != null) onOpenDeleteTimelineModal(selectedTimeline);
    },
    enabled: ({ savedObjectId, status }: OpenTimelineResult) =>
      savedObjectId != null && status !== TimelineStatus.immutable,
    description: i18n.DELETE_SELECTED,
    'data-test-subj': 'delete-timeline',
    available: () => actionTimelineToShow.includes('delete') && deleteTimelines != null,
  } as Action;

  const createRuleFromTimeline = {
    name: i18n.CREATE_RULE_FROM_TIMELINE,
    icon: 'indexEdit' as typeof ICON_TYPES[number],
    type: 'icon',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (onCreateRule != null && selectedTimeline.savedObjectId)
        onCreateRule(selectedTimeline.savedObjectId);
    },
    enabled: (timeline: OpenTimelineResult) =>
      onCreateRule != null &&
      timeline.savedObjectId != null &&
      timeline.status !== TimelineStatus.immutable,
    description: i18n.CREATE_RULE_FROM_TIMELINE,
    'data-test-subj': 'create-rule-from-timeline',
    available: ({ queryType }: OpenTimelineResult) =>
      actionTimelineToShow.includes('createRule') &&
      onCreateRule != null &&
      queryType != null &&
      queryType.hasQuery,
  } as Action;

  const createRuleFromTimelineCorrelation = {
    name: i18n.CREATE_RULE_FROM_TIMELINE_CORRELATION,
    icon: 'indexEdit' as typeof ICON_TYPES[number],
    type: 'icon',
    onClick: (selectedTimeline: OpenTimelineResult) => {
      if (onCreateRuleFromEql != null && selectedTimeline.savedObjectId)
        onCreateRuleFromEql(selectedTimeline.savedObjectId);
    },
    enabled: (timeline: OpenTimelineResult) =>
      onCreateRuleFromEql != null &&
      timeline.savedObjectId != null &&
      timeline.status !== TimelineStatus.immutable,
    description: i18n.CREATE_RULE_FROM_TIMELINE,
    'data-test-subj': 'create-rule-from-eql',
    available: ({ queryType }: OpenTimelineResult) =>
      actionTimelineToShow.includes('createRuleFromEql') &&
      onCreateRuleFromEql != null &&
      queryType != null &&
      queryType.hasEql,
  } as Action;
  return [
    {
      width: hasCrudAccess ? '80px' : '150px',
      actions: [
        createTimelineFromTemplate,
        createTemplateFromTimeline,
        openAsDuplicateColumn,
        openAsDuplicateTemplateColumn,
        exportTimelineAction,
        deleteTimelineColumn,
        createRuleFromTimeline,
        createRuleFromTimelineCorrelation,
      ],
    },
  ];
};
