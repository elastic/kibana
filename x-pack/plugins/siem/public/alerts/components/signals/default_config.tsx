/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import ApolloClient from 'apollo-client';

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

import { FILTER_OPEN } from './signals_filter_group';
import { sendSignalToTimelineAction, updateSignalStatusAction } from './actions';
import * as i18n from './translations';
import {
  CreateTimeline,
  SetEventsDeletedProps,
  SetEventsLoadingProps,
  UpdateTimelineLoading,
} from './types';

export const signalsOpenFilters: Filter[] = [
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

export const signalsClosedFilters: Filter[] = [
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

export const buildSignalsRuleIdFilter = (ruleId: string): Filter[] => [
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

export const signalsHeaders: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH + 5,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.name',
    label: i18n.SIGNALS_HEADERS_RULE,
    linkField: 'signal.rule.id',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.version',
    label: i18n.SIGNALS_HEADERS_VERSION,
    width: 95,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.type',
    label: i18n.SIGNALS_HEADERS_METHOD,
    width: 100,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.severity',
    label: i18n.SIGNALS_HEADERS_SEVERITY,
    width: 105,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.risk_score',
    label: i18n.SIGNALS_HEADERS_RISK_SCORE,
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

export const signalsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: signalsHeaders,
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

export const getSignalsActions = ({
  apolloClient,
  canUserCRUD,
  hasIndexWrite,
  setEventsLoading,
  setEventsDeleted,
  createTimeline,
  status,
  updateTimelineIsLoading,
}: {
  apolloClient?: ApolloClient<{}>;
  canUserCRUD: boolean;
  hasIndexWrite: boolean;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  createTimeline: CreateTimeline;
  status: 'open' | 'closed';
  updateTimelineIsLoading: UpdateTimelineLoading;
}): TimelineRowAction[] => [
  {
    onClick: ({ ecsData }: TimelineRowActionOnClick) =>
      sendSignalToTimelineAction({
        apolloClient,
        createTimeline,
        ecsData,
        updateTimelineIsLoading,
      }),
    iconType: 'timeline',
    dataTestSubj: 'send-signal-to-timeline',
    ariaLabel: 'Send signal to timeline',
    id: 'sendSignalToTimeline',
    width: 26,
    content: i18n.ACTION_INVESTIGATE_IN_TIMELINE,
    displayType: 'icon',
  },
  {
    onClick: ({ eventId }: TimelineRowActionOnClick) =>
      updateSignalStatusAction({
        signalIds: [eventId],
        status,
        setEventsLoading,
        setEventsDeleted,
      }),
    id: 'updateSignalStatus',
    width: 26,
    iconType: status === FILTER_OPEN ? 'securitySignalDetected' : 'securitySignalResolved',
    isActionDisabled: !canUserCRUD || !hasIndexWrite,
    dataTestSubj: 'update-signal-status',
    ariaLabel: 'Update signal status',
    content: status === FILTER_OPEN ? i18n.ACTION_OPEN_SIGNAL : i18n.ACTION_CLOSE_SIGNAL,
    displayType: 'icon',
  },
];
