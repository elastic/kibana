/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';

import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';
import { ColumnHeaderOptions, SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

import * as i18n from './translations';

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

export const buildShowBuildingBlockFilter = (showBuildingBlockAlerts: boolean): Filter[] => [
  ...(showBuildingBlockAlerts
    ? []
    : [
        {
          meta: {
            alias: null,
            negate: true,
            disabled: false,
            type: 'exists',
            key: 'signal.rule.building_block_type',
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: 'signal.rule.building_block_type' },
        },
      ]),
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
  excludedRowRendererIds: Object.values(RowRendererId),
};

export const requiredFieldsForActions = [
  '@timestamp',
  'signal.status',
  'signal.group.id',
  'signal.original_time',
  'signal.rule.building_block_type',
  'signal.rule.filters',
  'signal.rule.from',
  'signal.rule.language',
  'signal.rule.query',
  'signal.rule.name',
  'signal.rule.to',
  'signal.rule.id',
  'signal.rule.index',
  'signal.rule.type',
  'signal.original_event.kind',
  'signal.original_event.module',
  // Endpoint exception fields
  'file.path',
  'file.Ext.code_signature.subject_name',
  'file.Ext.code_signature.trusted',
  'file.hash.sha256',
  'host.os.family',
  'event.code',
];
