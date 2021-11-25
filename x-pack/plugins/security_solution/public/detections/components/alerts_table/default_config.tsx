/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_INSTANCE_ID,
  ALERT_RULE_PRODUCER,
  ALERT_START,
  ALERT_WORKFLOW_STATUS,
  ALERT_UUID,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
} from '@kbn/rule-data-utils';

import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { ColumnHeaderOptions, RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';

import { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { columns } from '../../configurations/security_solution_detections/columns';

export const buildAlertStatusFilter = (status: Status): Filter[] => {
  const combinedQuery =
    status === 'acknowledged'
      ? {
          bool: {
            should: [
              {
                term: {
                  'kibana.alert.workflow_status': status,
                },
              },
              {
                term: {
                  'kibana.alert.workflow_status': 'in-progress',
                },
              },
            ],
          },
        }
      : {
          term: {
            'kibana.alert.workflow_status': status,
          },
        };

  return [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'kibana.alert.workflow_status',
        params: {
          query: status,
        },
      },
      query: combinedQuery,
    },
  ];
};

/**
 * For backwards compatability issues, if `acknowledged` is a status prop, `in-progress` will likely have to be too
 */
export const buildAlertStatusesFilter = (statuses: Status[]): Filter[] => {
  const combinedQuery = {
    bool: {
      should: statuses.map((status) => ({
        term: {
          'kibana.alert.workflow_status': status,
        },
      })),
    },
  };

  return [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: combinedQuery,
    },
  ];
};

export const buildAlertsRuleIdFilter = (ruleId: string | null): Filter[] =>
  ruleId
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'kibana.alert.rule.uuid',
            params: {
              query: ruleId,
            },
          },
          query: {
            match_phrase: {
              'kibana.alert.rule.uuid': ruleId,
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
            key: 'kibana.alert.building_block_type',
            value: 'exists',
          },
          query: { exists: { field: 'kibana.alert.building_block_type' } },
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
            key: 'kibana.alert.rule.threat_mapping',
            type: 'exists',
            value: 'exists',
          },
          query: { exists: { field: 'kibana.alert.rule.threat_mapping' } },
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
  'kibana.alert.workflow_status',
  'kibana.alert.group.id',
  'kibana.alert.original_time',
  'kibana.alert.building_block_type',
  'kibana.alert.rule.filters',
  'kibana.alert.rule.from',
  'kibana.alert.rule.language',
  'kibana.alert.rule.query',
  'kibana.alert.rule.name',
  'kibana.alert.rule.to',
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.index',
  'kibana.alert.rule.type',
  'kibana.alert.original_event.kind',
  'kibana.alert.original_event.module',
  // Endpoint exception fields
  'file.path',
  'file.Ext.code_signature.subject_name',
  'file.Ext.code_signature.trusted',
  'file.hash.sha256',
  'host.os.family',
  'event.code',
];

// TODO: Once we are past experimental phase this code should be removed
export const buildAlertStatusFilterRuleRegistry = (status: Status): Filter[] => {
  const combinedQuery =
    status === 'acknowledged'
      ? {
          bool: {
            should: [
              {
                term: {
                  [ALERT_WORKFLOW_STATUS]: status,
                },
              },
              {
                term: {
                  [ALERT_WORKFLOW_STATUS]: 'in-progress',
                },
              },
            ],
          },
        }
      : {
          term: {
            [ALERT_WORKFLOW_STATUS]: status,
          },
        };

  return [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: ALERT_WORKFLOW_STATUS,
        params: {
          query: status,
        },
      },
      query: combinedQuery,
    },
  ];
};

// TODO: Once we are past experimental phase this code should be removed
export const buildAlertStatusesFilterRuleRegistry = (statuses: Status[]): Filter[] => {
  const combinedQuery = {
    bool: {
      should: statuses.map((status) => ({
        term: {
          [ALERT_WORKFLOW_STATUS]: status,
        },
      })),
    },
  };

  return [
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
      },
      query: combinedQuery,
    },
  ];
};

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
            key: 'kibana.alert.building_block_type',
            value: 'exists',
          },
          query: { exists: { field: 'kibana.alert.building_block_type' } },
        },
      ];

export const requiredFieldMappingsForActionsRuleRegistry = {
  '@timestamp': '@timestamp',
  'alert.instance.id': ALERT_INSTANCE_ID,
  'event.kind': 'event.kind',
  'alert.start': ALERT_START,
  'alert.uuid': ALERT_UUID,
  'event.action': 'event.action',
  'alert.workflow_status': ALERT_WORKFLOW_STATUS,
  'alert.duration.us': ALERT_DURATION,
  'rule.uuid': ALERT_RULE_UUID,
  'rule.name': ALERT_RULE_NAME,
  'rule.category': ALERT_RULE_CATEGORY,
  producer: ALERT_RULE_PRODUCER,
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
