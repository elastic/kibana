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
        // {
        //   meta: {
        //     alias: null,
        //     negate: true,
        //     disabled: false,
        //     type: 'exists',
        //     key: 'signal.rule.building_block_type',
        //     value: 'exists',
        //   },
        //   // @ts-expect-error TODO: Rework parent typings to support ExistsFilter[]
        //   exists: { field: 'signal.rule.building_block_type' },
        // },
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

export const alertsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns,
  showCheckboxes: true,
  excludedRowRendererIds: Object.values(RowRendererId),
};
