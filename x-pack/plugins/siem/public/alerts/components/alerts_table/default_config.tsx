/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import ApolloClient from 'apollo-client';
import React from 'react';

import { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import {
  TimelineAction,
  TimelineActionProps,
} from '../../../timelines/components/timeline/body/actions';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import { ColumnHeaderOptions, SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import { FILTER_OPEN } from './alerts_filter_group';
import { sendAlertToTimelineAction, updateAlertStatusAction } from './actions';
import * as i18n from './translations';
import {
  CreateTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateTimelineLoading,
} from './types';

export const alertsOpenFilters: Filter[] = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.status',
      params: {
        query: 'open',
      },
    },
    query: {
      match_phrase: {
        'signal.status': 'open',
      },
    },
  },
];

export const alertsClosedFilters: Filter[] = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.status',
      params: {
        query: 'closed',
      },
    },
    query: {
      match_phrase: {
        'signal.status': 'closed',
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
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
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
    width: 100,
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
  hasIndexWrite,
  setEventsLoading,
  setEventsDeleted,
  createTimeline,
  status,
  updateTimelineIsLoading,
  onAlertStatusUpdateSuccess,
  onAlertStatusUpdateFailure,
}: {
  apolloClient?: ApolloClient<{}>;
  canUserCRUD: boolean;
  hasIndexWrite: boolean;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  createTimeline: CreateTimeline;
  status: 'open' | 'closed';
  updateTimelineIsLoading: UpdateTimelineLoading;
  onAlertStatusUpdateSuccess: (count: number, status: string) => void;
  onAlertStatusUpdateFailure: (status: string, error: Error) => void;
}): TimelineAction[] => [
  {
    getAction: ({ ecsData }: TimelineActionProps): JSX.Element => (
      <EuiToolTip
        data-test-subj="send-alert-to-timeline-tool-tip"
        content={i18n.ACTION_INVESTIGATE_IN_TIMELINE}
      >
        <EuiButtonIcon
          data-test-subj="send-alert-to-timeline-button"
          onClick={() =>
            sendAlertToTimelineAction({
              apolloClient,
              createTimeline,
              ecsData,
              updateTimelineIsLoading,
            })
          }
          iconType="timeline"
          aria-label="Next"
        />
      </EuiToolTip>
    ),
    id: 'sendAlertToTimeline',
    width: 26,
  },
  {
    getAction: ({ eventId }: TimelineActionProps): JSX.Element => (
      <EuiToolTip
        data-test-subj="update-alert-status-tool-tip"
        content={status === FILTER_OPEN ? i18n.ACTION_OPEN_ALERT : i18n.ACTION_CLOSE_ALERT}
      >
        <EuiButtonIcon
          data-test-subj={'update-alert-status-button'}
          onClick={() =>
            updateAlertStatusAction({
              alertIds: [eventId],
              status,
              setEventsLoading,
              setEventsDeleted,
              onAlertStatusUpdateSuccess,
              onAlertStatusUpdateFailure,
            })
          }
          isDisabled={!canUserCRUD || !hasIndexWrite}
          iconType={status === FILTER_OPEN ? 'securityAlertDetected' : 'securityAlertResolved'}
          aria-label="Next"
        />
      </EuiToolTip>
    ),
    id: 'updateAlertStatus',
    width: 26,
  },
];
