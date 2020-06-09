/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import ApolloClient from 'apollo-client';

import { AlertStateStatus } from '../../../../common/detection_engine/types';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import {
  TimelineRowAction,
  TimelineRowActionOnClick,
} from '../../../timelines/components/timeline/body/actions';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import { ColumnHeaderOptions, SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from './alerts_filter_group';
import { sendAlertToTimelineAction, updateAlertStatusAction } from './actions';
import * as i18n from './translations';
import {
  CreateTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateTimelineLoading,
} from './types';

export const buildAlertStatusFilter = (status: AlertStateStatus): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.status',
      params: {
        query: status,
      },
    },
    query: {
      match_phrase: {
        'signal.status': status,
      },
    },
  },
];

export const buildAlertsRuleIdFilter = (ruleId: string): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.rule.id',
      params: {
        query: ruleId,
      },
    },
    query: {
      match_phrase: {
        'signal.rule.id': ruleId,
      },
    },
  },
];

export const alertsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH + 5,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.name',
    label: i18n.ALERTS_HEADERS_RULE,
    linkField: 'signal.rule.id',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.version',
    label: i18n.ALERTS_HEADERS_VERSION,
    width: 95,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.type',
    label: i18n.ALERTS_HEADERS_METHOD,
    width: 100,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.severity',
    label: i18n.ALERTS_HEADERS_SEVERITY,
    width: 105,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.risk_score',
    label: i18n.ALERTS_HEADERS_RISK_SCORE,
    width: 115,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.module',
    linkField: 'rule.reference',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'event',
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    type: 'string',
    aggregatable: true,
    width: 140,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    width: 150,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
    width: 140,
  },
];

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: alertsHeaders,
  showCheckboxes: true,
  showRowRenderers: false,
};

export const requiredFieldsForActions = [
  '@timestamp',
  'signal.original_time',
  'signal.rule.filters',
  'signal.rule.from',
  'signal.rule.language',
  'signal.rule.query',
  'signal.rule.to',
  'signal.rule.id',
];

export const getAlertActions = ({
  apolloClient,
  canUserCRUD,
  createTimeline,
  hasIndexWrite,
  onAlertStatusUpdateFailure,
  onAlertStatusUpdateSuccess,
  setEventsDeleted,
  setEventsLoading,
  status,
  updateTimelineIsLoading,
}: {
  apolloClient?: ApolloClient<{}>;
  canUserCRUD: boolean;
  createTimeline: CreateTimeline;
  hasIndexWrite: boolean;
  onAlertStatusUpdateFailure: (status: AlertStateStatus, error: Error) => void;
  onAlertStatusUpdateSuccess: (count: number, status: AlertStateStatus) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  status: AlertStateStatus;
  updateTimelineIsLoading: UpdateTimelineLoading;
}): TimelineRowAction[] => {
  const openAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Open alert',
    content: i18n.ACTION_OPEN_ALERT,
    dataTestSubj: 'update-alert-status',
    displayType: 'contextMenu',
    iconType: 'securitySignalDetected',
    id: FILTER_OPEN,
    isActionDisabled: !canUserCRUD || !hasIndexWrite,
    onClick: ({ eventId }: TimelineRowActionOnClick) =>
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        status,
        selectedStatus: FILTER_OPEN,
      }),
    width: 26,
  };

  const closeAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Close alert',
    content: i18n.ACTION_CLOSE_ALERT,
    dataTestSubj: 'update-alert-status',
    displayType: 'contextMenu',
    iconType: 'securitySignalResolved',
    id: FILTER_CLOSED,
    isActionDisabled: !canUserCRUD || !hasIndexWrite,
    onClick: ({ eventId }: TimelineRowActionOnClick) =>
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        status,
        selectedStatus: FILTER_CLOSED,
      }),
    width: 26,
  };

  const inProgressAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Update alert status',
    content: i18n.ACTION_IN_PROGRESS_ALERT,
    dataTestSubj: 'update-alert-status',
    displayType: 'contextMenu',
    iconType: 'alert',
    id: FILTER_IN_PROGRESS,
    isActionDisabled: !canUserCRUD || !hasIndexWrite,
    onClick: ({ eventId }: TimelineRowActionOnClick) =>
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        status,
        selectedStatus: FILTER_IN_PROGRESS,
      }),
    width: 26,
  };

  return [
    {
      ariaLabel: 'Send alert to timeline',
      content: i18n.ACTION_INVESTIGATE_IN_TIMELINE,
      dataTestSubj: 'send-alert-to-timeline',
      displayType: 'icon',
      iconType: 'timeline',
      id: 'sendAlertToTimeline',
      onClick: ({ ecsData }: TimelineRowActionOnClick) =>
        sendAlertToTimelineAction({
          apolloClient,
          createTimeline,
          ecsData,
          updateTimelineIsLoading,
        }),
      width: 26,
    },
    // Context menu items
    ...(FILTER_OPEN !== status ? [openAlertActionComponent] : []),
    ...(FILTER_CLOSED !== status ? [closeAlertActionComponent] : []),
    ...(FILTER_IN_PROGRESS !== status ? [inProgressAlertActionComponent] : []),
  ];
};
