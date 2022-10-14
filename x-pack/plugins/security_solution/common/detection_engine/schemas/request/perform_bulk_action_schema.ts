/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyArray, TimeDuration, enumeration } from '@kbn/securitysolution-io-ts-types';
import {
  action_group as actionGroup,
  action_params as actionParams,
  action_id as actionId,
} from '@kbn/securitysolution-io-ts-alerting-types';

import {
  IndexPatternArray,
  RuleQuery,
  RuleTagArray,
  TimelineTemplateId,
  TimelineTemplateTitle,
} from '../../rule_schema';

export enum BulkAction {
  'enable' = 'enable',
  'disable' = 'disable',
  'export' = 'export',
  'delete' = 'delete',
  'duplicate' = 'duplicate',
  'edit' = 'edit',
}

export const bulkAction = enumeration('BulkAction', BulkAction);

export enum BulkActionEditType {
  'add_tags' = 'add_tags',
  'delete_tags' = 'delete_tags',
  'set_tags' = 'set_tags',
  'add_index_patterns' = 'add_index_patterns',
  'delete_index_patterns' = 'delete_index_patterns',
  'set_index_patterns' = 'set_index_patterns',
  'set_timeline' = 'set_timeline',
  'add_rule_actions' = 'add_rule_actions',
  'set_rule_actions' = 'set_rule_actions',
  'set_schedule' = 'set_schedule',
}

export const throttleForBulkActions = t.union([
  t.literal('rule'),
  TimeDuration({
    allowedDurations: [
      [1, 'h'],
      [1, 'd'],
      [7, 'd'],
    ],
  }),
]);
export type ThrottleForBulkActions = t.TypeOf<typeof throttleForBulkActions>;

const bulkActionEditPayloadTags = t.type({
  type: t.union([
    t.literal(BulkActionEditType.add_tags),
    t.literal(BulkActionEditType.delete_tags),
    t.literal(BulkActionEditType.set_tags),
  ]),
  value: RuleTagArray,
});

export type BulkActionEditPayloadTags = t.TypeOf<typeof bulkActionEditPayloadTags>;

const bulkActionEditPayloadIndexPatterns = t.intersection([
  t.type({
    type: t.union([
      t.literal(BulkActionEditType.add_index_patterns),
      t.literal(BulkActionEditType.delete_index_patterns),
      t.literal(BulkActionEditType.set_index_patterns),
    ]),
    value: IndexPatternArray,
  }),
  t.exact(t.partial({ overwrite_data_views: t.boolean })),
]);

export type BulkActionEditPayloadIndexPatterns = t.TypeOf<
  typeof bulkActionEditPayloadIndexPatterns
>;

const bulkActionEditPayloadTimeline = t.type({
  type: t.literal(BulkActionEditType.set_timeline),
  value: t.type({
    timeline_id: TimelineTemplateId,
    timeline_title: TimelineTemplateTitle,
  }),
});

export type BulkActionEditPayloadTimeline = t.TypeOf<typeof bulkActionEditPayloadTimeline>;

/**
 * per rulesClient.bulkEdit rules actions operation contract (x-pack/plugins/alerting/server/rules_client/rules_client.ts)
 * normalized rule action object is expected (NormalizedAlertAction) as value for the edit operation
 */
const normalizedRuleAction = t.exact(
  t.type({
    group: actionGroup,
    id: actionId,
    params: actionParams,
  })
);

const bulkActionEditPayloadRuleActions = t.type({
  type: t.union([
    t.literal(BulkActionEditType.add_rule_actions),
    t.literal(BulkActionEditType.set_rule_actions),
  ]),
  value: t.type({
    throttle: throttleForBulkActions,
    actions: t.array(normalizedRuleAction),
  }),
});

export type BulkActionEditPayloadRuleActions = t.TypeOf<typeof bulkActionEditPayloadRuleActions>;

const bulkActionEditPayloadSchedule = t.type({
  type: t.literal(BulkActionEditType.set_schedule),
  value: t.type({
    interval: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
    lookback: TimeDuration({ allowedUnits: ['s', 'm', 'h'] }),
  }),
});
export type BulkActionEditPayloadSchedule = t.TypeOf<typeof bulkActionEditPayloadSchedule>;

export const bulkActionEditPayload = t.union([
  bulkActionEditPayloadTags,
  bulkActionEditPayloadIndexPatterns,
  bulkActionEditPayloadTimeline,
  bulkActionEditPayloadRuleActions,
  bulkActionEditPayloadSchedule,
]);

export type BulkActionEditPayload = t.TypeOf<typeof bulkActionEditPayload>;

/**
 * actions that modify rules attributes
 */
export type BulkActionEditForRuleAttributes =
  | BulkActionEditPayloadTags
  | BulkActionEditPayloadRuleActions
  | BulkActionEditPayloadSchedule;

/**
 * actions that modify rules params
 */
export type BulkActionEditForRuleParams =
  | BulkActionEditPayloadIndexPatterns
  | BulkActionEditPayloadTimeline
  | BulkActionEditPayloadSchedule;

export const performBulkActionSchema = t.intersection([
  t.exact(
    t.type({
      query: t.union([RuleQuery, t.undefined]),
    })
  ),
  t.exact(t.partial({ ids: NonEmptyArray(t.string) })),
  t.union([
    t.exact(
      t.type({
        action: t.union([
          t.literal(BulkAction.delete),
          t.literal(BulkAction.disable),
          t.literal(BulkAction.duplicate),
          t.literal(BulkAction.enable),
          t.literal(BulkAction.export),
        ]),
      })
    ),
    t.exact(
      t.type({
        action: t.literal(BulkAction.edit),
        [BulkAction.edit]: NonEmptyArray(bulkActionEditPayload),
      })
    ),
  ]),
]);

export const performBulkActionQuerySchema = t.exact(
  t.partial({
    dry_run: t.union([t.literal('true'), t.literal('false')]),
  })
);

export type PerformBulkActionSchema = t.TypeOf<typeof performBulkActionSchema>;
