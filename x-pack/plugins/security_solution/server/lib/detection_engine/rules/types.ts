/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';

import type { SavedObjectAttributes, SavedObjectsClientContract } from '@kbn/core/server';
import { ruleTypeMappings } from '@kbn/securitysolution-rules';

import type { RulesClient, PartialRule, BulkEditOperation } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { UpdateRulesSchema } from '../../../../common/detection_engine/schemas/request';
import type {
  Id,
  IdOrUndefined,
  RuleIdOrUndefined,
  PerPageOrUndefined,
  PageOrUndefined,
  SortFieldOrUndefined,
  QueryFilterOrUndefined,
  FieldsOrUndefined,
  SortOrderOrUndefined,
} from '../../../../common/detection_engine/schemas/common';

import type { RuleParams } from '../schemas/rule_schemas';
import type { IRuleExecutionLogForRoutes } from '../rule_execution_log';
import type { CreateRulesSchema } from '../../../../common/detection_engine/schemas/request/rule_schemas';
import type { PatchRulesSchema } from '../../../../common/detection_engine/schemas/request/patch_rules_schema';

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
  attributes: IRuleAssetSOAttributes & SavedObjectAttributes;
}

export interface HapiReadableStream extends Readable {
  hapi: {
    filename: string;
  };
}

export interface Clients {
  rulesClient: RulesClient;
}

export const isAlertTypes = (
  partialAlert: Array<PartialRule<RuleParams>>
): partialAlert is RuleAlertType[] => {
  return partialAlert.every((rule) => isAlertType(rule));
};

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
  params: PatchRulesSchema;
  rule: RuleAlertType | null | undefined;
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
  perPage: PerPageOrUndefined;
  page: PageOrUndefined;
  sortField: SortFieldOrUndefined;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortOrder: SortOrderOrUndefined;
}

export interface BulkEditRulesOptions {
  isRuleRegistryEnabled: boolean;
  rulesClient: RulesClient;
  operations: BulkEditOperation[];
  filter?: QueryFilterOrUndefined;
  ids?: string[];
  paramsModifier?: (params: RuleParams) => Promise<RuleParams>;
}

export interface LegacyMigrateParams {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: SanitizedRule<RuleParams> | null | undefined;
}
