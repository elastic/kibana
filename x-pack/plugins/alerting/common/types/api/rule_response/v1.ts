/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { ruleResponseSchemasV1 } from '../../../api_schemas';

export type {
  RuleNotifyWhen,
  RuleLastRunOutcomeValues,
  RuleExecutionStatusValues,
  RuleExecutionStatusErrorReason,
  RuleExecutionStatusWarningReason,
} from '../../../api_schemas/rule_response_schemas/v1';

export type RuleParams = TypeOf<typeof ruleResponseSchemasV1.ruleParamsSchema>;
type RuleResponseSchemaType = TypeOf<typeof ruleResponseSchemasV1.ruleResponseSchema>;
type PublicRuleResponseSchemaType = TypeOf<typeof ruleResponseSchemasV1.publicRuleResponseSchema>;

export interface RuleResponse<Params extends RuleParams = never> {
  id: RuleResponseSchemaType['id'];
  enabled: RuleResponseSchemaType['enabled'];
  name: RuleResponseSchemaType['name'];
  tags: RuleResponseSchemaType['tags'];
  rule_type_id: RuleResponseSchemaType['rule_type_id'];
  consumer: RuleResponseSchemaType['consumer'];
  schedule: RuleResponseSchemaType['schedule'];
  actions: RuleResponseSchemaType['actions'];
  params: Params;
  mapped_params?: RuleResponseSchemaType['mapped_params'];
  scheduled_task_id?: RuleResponseSchemaType['scheduled_task_id'];
  created_by: RuleResponseSchemaType['created_by'];
  updated_by: RuleResponseSchemaType['updated_by'];
  created_at: RuleResponseSchemaType['created_at'];
  updated_at: RuleResponseSchemaType['updated_at'];
  api_key_owner: RuleResponseSchemaType['api_key_owner'];
  api_key_created_by_user?: RuleResponseSchemaType['api_key_created_by_user'];
  throttle?: RuleResponseSchemaType['throttle'];
  mute_all: RuleResponseSchemaType['mute_all'];
  notify_when?: RuleResponseSchemaType['notify_when'];
  muted_alert_ids: RuleResponseSchemaType['muted_alert_ids'];
  execution_status: RuleResponseSchemaType['execution_status'];
  monitoring?: RuleResponseSchemaType['monitoring'];
  snooze_schedule?: RuleResponseSchemaType['snooze_schedule'];
  active_snoozes?: RuleResponseSchemaType['active_snoozes'];
  is_snoozed_until?: RuleResponseSchemaType['is_snoozed_until'];
  last_run?: RuleResponseSchemaType['last_run'];
  next_run?: RuleResponseSchemaType['next_run'];
  revision: RuleResponseSchemaType['revision'];
  running?: RuleResponseSchemaType['running'];
  view_in_app_relative_url?: RuleResponseSchemaType['view_in_app_relative_url'];
}

export interface PublicRuleResponse<Params extends RuleParams = never> {
  id: PublicRuleResponseSchemaType['id'];
  enabled: PublicRuleResponseSchemaType['enabled'];
  name: PublicRuleResponseSchemaType['name'];
  tags: PublicRuleResponseSchemaType['tags'];
  rule_type_id: PublicRuleResponseSchemaType['rule_type_id'];
  consumer: PublicRuleResponseSchemaType['consumer'];
  schedule: PublicRuleResponseSchemaType['schedule'];
  actions: PublicRuleResponseSchemaType['actions'];
  params: Params;
  scheduled_task_id?: PublicRuleResponseSchemaType['scheduled_task_id'];
  created_by: PublicRuleResponseSchemaType['created_by'];
  updated_by: PublicRuleResponseSchemaType['updated_by'];
  created_at: PublicRuleResponseSchemaType['created_at'];
  updated_at: PublicRuleResponseSchemaType['updated_at'];
  api_key_owner: PublicRuleResponseSchemaType['api_key_owner'];
  api_key_created_by_user?: PublicRuleResponseSchemaType['api_key_created_by_user'];
  throttle?: PublicRuleResponseSchemaType['throttle'];
  mute_all: PublicRuleResponseSchemaType['mute_all'];
  notify_when?: PublicRuleResponseSchemaType['notify_when'];
  muted_alert_ids: PublicRuleResponseSchemaType['muted_alert_ids'];
  execution_status: PublicRuleResponseSchemaType['execution_status'];
  is_snoozed_until?: PublicRuleResponseSchemaType['is_snoozed_until'];
  last_run?: PublicRuleResponseSchemaType['last_run'];
  next_run?: PublicRuleResponseSchemaType['next_run'];
  revision: PublicRuleResponseSchemaType['revision'];
  running?: PublicRuleResponseSchemaType['running'];
}
