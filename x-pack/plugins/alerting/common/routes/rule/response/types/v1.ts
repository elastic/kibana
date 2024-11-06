/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1 } from '@kbn/response-ops-rule-params';
import {
  ruleResponseSchemaV1,
  ruleSnoozeScheduleSchemaV1,
  ruleLastRunSchemaV1,
  monitoringSchemaV1,
} from '..';

export type RuleSnoozeSchedule = TypeOf<typeof ruleSnoozeScheduleSchemaV1>;
export type RuleLastRun = TypeOf<typeof ruleLastRunSchemaV1>;
export type Monitoring = TypeOf<typeof monitoringSchemaV1>;

type RuleResponseSchemaType = TypeOf<typeof ruleResponseSchemaV1>;

export interface RuleResponse<Params extends RuleParamsV1 = never> {
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
  execution_status?: RuleResponseSchemaType['execution_status'];
  monitoring?: RuleResponseSchemaType['monitoring'];
  snooze_schedule?: RuleResponseSchemaType['snooze_schedule'];
  active_snoozes?: RuleResponseSchemaType['active_snoozes'];
  is_snoozed_until?: RuleResponseSchemaType['is_snoozed_until'];
  last_run?: RuleResponseSchemaType['last_run'];
  next_run?: RuleResponseSchemaType['next_run'];
  revision: RuleResponseSchemaType['revision'];
  running?: RuleResponseSchemaType['running'];
  view_in_app_relative_url?: RuleResponseSchemaType['view_in_app_relative_url'];
  alert_delay?: RuleResponseSchemaType['alert_delay'];
  flapping?: RuleResponseSchemaType['flapping'];
}
