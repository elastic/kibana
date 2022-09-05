/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import type {
  FieldsOrUndefined,
  Id,
  IdOrUndefined,
  PageOrUndefined,
  PerPageOrUndefined,
  QueryFilterOrUndefined,
  RuleIdOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '../../../../common/detection_engine/schemas/common';

import type { CreateRulesSchema } from '../../../../common/detection_engine/schemas/request/rule_schemas';
import type { PatchRulesSchema } from '../../../../common/detection_engine/schemas/request/patch_rules_schema';
import type { UpdateRulesSchema } from '../../../../common/detection_engine/schemas/request';

import type { RuleParams } from '../schemas/rule_schemas';
import type { IRuleExecutionLogForRoutes } from '../rule_monitoring';

export type RuleAlertType = SanitizedRule<RuleParams>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleAssetSOAttributes extends Record<string, any> {
  rule_id: string | null | undefined;
  version: string | null | undefined;
  name: string | null | undefined;
}

export interface IRuleAssetSavedObject {
  type: string;
  id: string;
  attributes: IRuleAssetSOAttributes;
}

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

export interface Clients {
  rulesClient: RulesClient;
}

export const isAlertType = (
  partialAlert: PartialRule<RuleParams>
): partialAlert is RuleAlertType => {
  const ruleTypeValues = Object.values(ruleTypeMappings) as unknown as string[];
  return ruleTypeValues.includes(partialAlert.alertTypeId as string);
};

export interface CreateRulesOptions<T extends CreateRulesSchema = CreateRulesSchema> {
  rulesClient: RulesClient;
  params: T;
  id?: string;
  immutable?: boolean;
  defaultEnabled?: boolean;
}

export interface UpdateRulesOptions {
  rulesClient: RulesClient;
  existingRule: RuleAlertType | null | undefined;
  ruleUpdate: UpdateRulesSchema;
}

export interface PatchRulesOptions {
  rulesClient: RulesClient;
  nextParams: PatchRulesSchema;
  existingRule: RuleAlertType | null | undefined;
}

export interface ReadRuleOptions {
  rulesClient: RulesClient;
  id: IdOrUndefined;
  ruleId: RuleIdOrUndefined;
}

export interface DeleteRuleOptions {
  ruleId: Id;
  rulesClient: RulesClient;
  ruleExecutionLog: IRuleExecutionLogForRoutes;
}

export interface FindRuleOptions {
  rulesClient: RulesClient;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  page: PageOrUndefined;
  perPage: PerPageOrUndefined;
}

export interface LegacyMigrateParams {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: SanitizedRule<RuleParams> | null | undefined;
}
