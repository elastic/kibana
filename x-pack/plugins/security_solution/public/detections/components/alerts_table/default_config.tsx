/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';

import { ColumnHeaderOptions, SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { columns } from '../../configurations/security_solution_detections/columns';

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

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns,
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

// TODO: Once we are past experimental phase this code should be removed
export const buildAlertStatusFilterRuleRegistry = (status: Status): Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'kibana.rac.alert.status',
      params: {
        query: status,
      },
    },
    query: {
      term: {
        'kibana.rac.alert.status': status,
      },
    },
  },
];

export const buildShowBuildingBlockFilterRuleRegistry = (
  showBuildingBlockAlerts: boolean
): Filter[] =>
  showBuildingBlockAlerts
    ? []
    : [
        {
          meta: {
            alias: null,
            negate: true,
            disabled: false,
            type: 'exists',
            key: 'kibana.rac.rule.building_block_type',
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: 'kibana.rac.rule.building_block_type' },
        },
      ];

export const requiredFieldMappingsForActionsRuleRegistry = {
  '@timestamp': '@timestamp',
  'alert.id': 'kibana.rac.alert.id',
  'event.kind': 'event.kind',
  'alert.start': 'kibana.rac.alert.start',
  'alert.uuid': 'kibana.rac.alert.uuid',
  'event.action': 'event.action',
  'alert.status': 'kibana.rac.alert.status',
  'alert.duration.us': 'kibana.rac.alert.duration.us',
  'rule.uuid': 'rule.uuid',
  'rule.id': 'rule.id',
  'rule.name': 'rule.name',
  'rule.category': 'rule.category',
  producer: 'kibana.rac.alert.producer',
  tags: 'tags',
};

export const alertsHeadersRuleRegistry: ColumnHeaderOptions[] = Object.entries(
  requiredFieldMappingsForActionsRuleRegistry
).map<ColumnHeaderOptions>(([alias, field]) => ({
  columnHeaderType: defaultColumnHeaderType,
  displayAsText: alias,
  id: field,
}));

export const alertsDefaultModelRuleRegistry: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: alertsHeadersRuleRegistry,
  showCheckboxes: true,
  excludedRowRendererIds: Object.values(RowRendererId),
};
