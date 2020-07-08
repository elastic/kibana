/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import ApolloClient from 'apollo-client';
import { Dispatch } from 'redux';

import { EuiText } from '@elastic/eui';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import {
  TimelineRowAction,
  TimelineRowActionOnClick,
} from '../../../timelines/components/timeline/body/actions';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { getInvestigateInResolverAction } from '../../../timelines/components/timeline/body/helpers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../../timelines/components/timeline/helpers';
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
import { Ecs } from '../../../graphql/types';
import { AddExceptionOnClick } from '../../../common/components/exceptions/add_exception_modal';
import { getMappedNonEcsValue } from '../../../common/components/exceptions/helpers';

export const buildAlertStatusFilter = (status: Status): Filter[] => [
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
      term: {
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

  // Endpoint exception fields
  'file.path',
  'file.Ext.code_signature.subject_name',
  'file.Ext.code_signature.trusted',
  'file.hash.sha1',
  'host.os.family',
];

interface AlertActionArgs {
  apolloClient?: ApolloClient<{}>;
  canUserCRUD: boolean;
  createTimeline: CreateTimeline;
  dispatch: Dispatch;
  ecsRowData: Ecs;
  hasIndexWrite: boolean;
  onAlertStatusUpdateFailure: (status: Status, error: Error) => void;
  onAlertStatusUpdateSuccess: (count: number, status: Status) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  status: Status;
  timelineId: string;
  updateTimelineIsLoading: UpdateTimelineLoading;
  openAddExceptionModal: ({
    exceptionListType,
    alertData,
    ruleName,
    ruleId,
  }: AddExceptionOnClick) => void;
}

export const getAlertActions = ({
  apolloClient,
  canUserCRUD,
  createTimeline,
  dispatch,
  ecsRowData,
  hasIndexWrite,
  onAlertStatusUpdateFailure,
  onAlertStatusUpdateSuccess,
  setEventsDeleted,
  setEventsLoading,
  status,
  timelineId,
  updateTimelineIsLoading,
  openAddExceptionModal,
}: AlertActionArgs): TimelineRowAction[] => {
  const openAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Open alert',
    content: <EuiText size="m">{i18n.ACTION_OPEN_ALERT}</EuiText>,
    dataTestSubj: 'open-alert-status',
    displayType: 'contextMenu',
    id: FILTER_OPEN,
    isActionDisabled: () => !canUserCRUD || !hasIndexWrite,
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
    width: DEFAULT_ICON_BUTTON_WIDTH,
  };

  const closeAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Close alert',
    content: <EuiText size="m">{i18n.ACTION_CLOSE_ALERT}</EuiText>,
    dataTestSubj: 'close-alert-status',
    displayType: 'contextMenu',
    id: FILTER_CLOSED,
    isActionDisabled: () => !canUserCRUD || !hasIndexWrite,
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
    width: DEFAULT_ICON_BUTTON_WIDTH,
  };

  const inProgressAlertActionComponent: TimelineRowAction = {
    ariaLabel: 'Mark alert in progress',
    content: <EuiText size="m">{i18n.ACTION_IN_PROGRESS_ALERT}</EuiText>,
    dataTestSubj: 'in-progress-alert-status',
    displayType: 'contextMenu',
    id: FILTER_IN_PROGRESS,
    isActionDisabled: () => !canUserCRUD || !hasIndexWrite,
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
    width: DEFAULT_ICON_BUTTON_WIDTH,
  };

  return [
    {
      ...getInvestigateInResolverAction({ dispatch, timelineId }),
    },
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
      width: DEFAULT_ICON_BUTTON_WIDTH,
    },
    // Context menu items
    ...(FILTER_OPEN !== status ? [openAlertActionComponent] : []),
    ...(FILTER_CLOSED !== status ? [closeAlertActionComponent] : []),
    ...(FILTER_IN_PROGRESS !== status ? [inProgressAlertActionComponent] : []),
    // TODO: disable this option if the alert is not an Endpoint alert
    {
      onClick: ({ ecsData, data }: TimelineRowActionOnClick) => {
        const ruleNameValue = getMappedNonEcsValue({ data, fieldName: 'signal.rule.name' });
        const ruleId = getMappedNonEcsValue({ data, fieldName: 'signal.rule.id' });
        if (ruleId !== undefined && ruleId.length > 0) {
          openAddExceptionModal({
            ruleName: ruleNameValue ? ruleNameValue[0] : '',
            ruleId: ruleId[0],
            exceptionListType: 'endpoint',
            alertData: {
              ecsData,
              nonEcsData: data,
            },
          });
        }
      },
      id: 'addEndpointException',
      isActionDisabled: () => !canUserCRUD || !hasIndexWrite,
      dataTestSubj: 'add-endpoint-exception-menu-item',
      ariaLabel: 'Add Endpoint Exception',
      content: <EuiText size="m">{i18n.ACTION_ADD_ENDPOINT_EXCEPTION}</EuiText>,
      displayType: 'contextMenu',
    },
    {
      onClick: ({ ecsData, data }: TimelineRowActionOnClick) => {
        const ruleNameValue = getMappedNonEcsValue({ data, fieldName: 'signal.rule.name' });
        const ruleId = getMappedNonEcsValue({ data, fieldName: 'signal.rule.id' });
        if (ruleId !== undefined && ruleId.length > 0) {
          openAddExceptionModal({
            ruleName: ruleNameValue ? ruleNameValue[0] : '',
            ruleId: ruleId[0],
            exceptionListType: 'detection',
            alertData: {
              ecsData,
              nonEcsData: data,
            },
          });
        }
      },
      id: 'addException',
      isActionDisabled: () => !canUserCRUD || !hasIndexWrite,
      dataTestSubj: 'add-exception-menu-item',
      ariaLabel: 'Add Exception',
      content: <EuiText size="m">{i18n.ACTION_ADD_EXCEPTION}</EuiText>,
      displayType: 'contextMenu',
    },
  ];
};
