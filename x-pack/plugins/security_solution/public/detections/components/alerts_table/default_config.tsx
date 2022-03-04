/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_WORKFLOW_STATUS,
  ALERT_RULE_RULE_ID,
} from '@kbn/rule-data-utils';

import type { Filter } from '@kbn/es-query';
import { RowRendererId } from '../../../../common/types/timeline';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
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

/**
 * For backwards compatability issues, if `acknowledged` is a status prop, `in-progress` will likely have to be too
 */
export const buildAlertStatusesFilter = (statuses: Status[]): Filter[] => {
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

/**
 * Builds Kuery filter for fetching alerts for a specific rule. Takes the rule's
 * static id, i.e. `rule.ruleId` (not rule.id), so that alerts for _all
 * historical instances_ of the rule are returned.
 *
 * @param ruleStaticId Rule's static id: `rule.ruleId`
 */
export const buildAlertsFilter = (ruleStaticId: string | null): Filter[] =>
  ruleStaticId
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: ALERT_RULE_RULE_ID,
            params: {
              query: ruleStaticId,
            },
          },
          query: {
            match_phrase: {
              [ALERT_RULE_RULE_ID]: ruleStaticId,
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
            key: ALERT_BUILDING_BLOCK_TYPE,
            value: 'exists',
          },
          query: { exists: { field: ALERT_BUILDING_BLOCK_TYPE } },
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
            key: 'kibana.alert.rule.type',
            type: 'term',
          },
          query: { term: { 'kibana.alert.rule.type': 'threat_match' } },
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
  'kibana.alert.rule.from',
  'kibana.alert.rule.name',
  'kibana.alert.rule.to',
  'kibana.alert.rule.uuid',
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
