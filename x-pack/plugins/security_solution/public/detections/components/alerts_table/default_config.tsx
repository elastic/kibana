/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';

import { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { columns } from '../../configurations/security_solution_detections/columns';

export const buildAlertStatusFilter = (status: Status): Filter[] => [
  // {
  //   meta: {
  //     alias: null,
  //     negate: false,
  //     disabled: false,
  //     type: 'phrase',
  //     key: 'signal.status',
  //     params: {
  //       query: status,
  //     },
  //   },
  //   query: {
  //     term: {
  //       'signal.status': status,
  //     },
  //   },
  // },
];

export const buildAlertsRuleIdFilter = (ruleId: string | null): Filter[] =>
  ruleId
    ? [
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
      ]
    : [];

export const buildShowBuildingBlockFilter = (showBuildingBlockAlerts: boolean): Filter[] =>
  showBuildingBlockAlerts
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
      ];

export const buildThreatMatchFilter = (showOnlyThreatIndicatorAlerts: boolean): Filter[] =>
  showOnlyThreatIndicatorAlerts
    ? [
        {
          meta: {
            alias: null,
            disabled: false,
            negate: false,
            key: 'signal.rule.threat_mapping',
            type: 'exists',
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: 'signal.rule.threat_mapping' },
        },
      ]
    : [];

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

export const requiredFieldsForActions = [
  'alert.id',
  '@timestamp',
  'event.kind',
  'alert.start',
  'alert.uuid',
  'event.action',
  'alert.status',
  'alert.duration.us',
  'rule.uuid',
  'rule.id',
  'rule.name',
  'rule.category',
  'producer',
  'tags',
];

// export const alertsHeaders: ColumnHeaderOptions[] = requiredFieldsForActions.map<ColumnHeaderOptions>(
//   (field) => ({
//     columnHeaderType: defaultColumnHeaderType,
//     id: field,
//     width: 120,
//   })
// );

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns,
  showCheckboxes: true,
  excludedRowRendererIds: Object.values(RowRendererId),
};
