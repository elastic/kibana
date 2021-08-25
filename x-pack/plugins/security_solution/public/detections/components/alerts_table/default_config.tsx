/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_ID,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_PRODUCER,
  ALERT_START,
  ALERT_UUID,
  ALERT_RULE_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { ColumnHeaderOptions, RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Filter } from '../../../../../../../src/plugins/data/common/es_query';
import { SubsetTimelineModel } from '../../../timelines/store/timeline/model';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { columns } from '../../configurations/security_solution_detections/columns';
import {
  ALERT_GROUP_ID,
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_BUILDING_BLOCK_TYPE,
  ALERT_RULE_FILTERS,
  ALERT_RULE_INDEX,
  ALERT_RULE_LANGUAGE,
  ALERT_RULE_QUERY,
} from '../../../../../timelines/common/alerts';

export const buildAlertStatusFilter = (status: Status): Filter[] => {
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

export const buildAlertsRuleIdFilter = (ruleId: string | null): Filter[] =>
  ruleId
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: ALERT_RULE_UUID,
            params: {
              query: ruleId,
            },
          },
          query: {
            match_phrase: {
              [ALERT_RULE_UUID]: ruleId,
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
            key: ALERT_RULE_BUILDING_BLOCK_TYPE,
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: ALERT_RULE_BUILDING_BLOCK_TYPE },
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
            key: 'signal.rule.threat_mapping', // TODO: Not updating to kibana.alert per: https://github.com/elastic/kibana/pull/107713/files#r692438231
            type: 'exists',
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: 'signal.rule.threat_mapping' }, // TODO: Not updating to kibana.alert per: https://github.com/elastic/kibana/pull/107713/files#r692438231
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
  ALERT_WORKFLOW_STATUS,
  ALERT_GROUP_ID,
  ALERT_ORIGINAL_TIME,
  ALERT_RULE_BUILDING_BLOCK_TYPE,
  ALERT_RULE_FILTERS,
  ALERT_RULE_LANGUAGE,
  ALERT_RULE_QUERY,
  ALERT_RULE_NAME,
  ALERT_RULE_TO,
  ALERT_RULE_UUID,
  ALERT_RULE_INDEX,
  ALERT_RULE_TYPE,
  ALERT_ORIGINAL_EVENT_KIND,
  ALERT_ORIGINAL_EVENT_MODULE,
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
            key: ALERT_RULE_BUILDING_BLOCK_TYPE,
            value: 'exists',
          },
          // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
          exists: { field: ALERT_RULE_BUILDING_BLOCK_TYPE },
        },
      ];

export const requiredFieldMappingsForActionsRuleRegistry = {
  '@timestamp': '@timestamp',
  'alert.id': ALERT_ID,
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
