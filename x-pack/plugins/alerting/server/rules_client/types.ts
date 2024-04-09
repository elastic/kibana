/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import {
  Logger,
  SavedObjectsClientContract,
  PluginInitializerContext,
  ISavedObjectsRepository,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import { ActionsClient, ActionsAuthorization } from '@kbn/actions-plugin/server';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '@kbn/security-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { DistributiveOmit } from '@elastic/eui';
import { RegistryRuleType } from '../rule_type_registry';
import {
  RuleTypeRegistry,
  IntervalSchedule,
  SanitizedRule,
  RuleSnoozeSchedule,
  RawRuleAlertsFilter,
  RuleSystemAction,
  RuleAction,
} from '../types';
import { AlertingAuthorization } from '../authorization';
import { AlertingConfig, AlertingRulesConfig } from '../config';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { GetAlertIndicesAlias } from '../lib';
import { AlertsService } from '../alerts_service';

export type {
  BulkEditOperation,
  BulkEditFields,
} from '../application/rule/methods/bulk_edit/types';
export type { FindOptions, FindResult } from './methods/find';
export type { UpdateOptions } from './methods/update';
export type { GetAlertSummaryParams } from './methods/get_alert_summary';
export type {
  GetExecutionLogByIdParams,
  GetGlobalExecutionLogParams,
} from './methods/get_execution_log';
export type {
  GetGlobalExecutionKPIParams,
  GetRuleExecutionKPIParams,
} from './methods/get_execution_kpi';
export type { GetActionErrorLogByIdParams } from './methods/get_action_error_log';

export interface RulesClientContext {
  readonly logger: Logger;
  readonly getUserName: () => Promise<string | null>;
  readonly spaceId: string;
  readonly namespace?: string;
  readonly taskManager: TaskManagerStartContract;
  readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  readonly authorization: AlertingAuthorization;
  readonly ruleTypeRegistry: RuleTypeRegistry;
  readonly minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  readonly maxScheduledPerMinute: AlertingRulesConfig['maxScheduledPerMinute'];
  readonly minimumScheduleIntervalInMs: number;
  readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  readonly getActionsClient: () => Promise<ActionsClient>;
  readonly actionsAuthorization: ActionsAuthorization;
  readonly getEventLogClient: () => Promise<IEventLogClient>;
  readonly internalSavedObjectsRepository: ISavedObjectsRepository;
  readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  readonly auditLogger?: AuditLogger;
  readonly eventLogger?: IEventLogger;
  readonly fieldsToExcludeFromPublicApi: Array<keyof SanitizedRule>;
  readonly isAuthenticationTypeAPIKey: () => boolean;
  readonly getAuthenticationAPIKey: (name: string) => CreateAPIKeyResult;
  readonly connectorAdapterRegistry: ConnectorAdapterRegistry;
  readonly getAlertIndicesAlias: GetAlertIndicesAlias;
  readonly alertsService: AlertsService | null;
  readonly isSystemAction: (actionId: string) => boolean;
  readonly uiSettings: UiSettingsServiceStart;
  readonly maxAlertsPerRun: AlertingConfig['rules']['run']['alerts']['max'];
}

export type NormalizedAlertAction = DistributiveOmit<RuleAction, 'actionTypeId'>;
export type NormalizedSystemAction = Omit<RuleSystemAction, 'actionTypeId'>;

export type NormalizedAlertDefaultActionWithGeneratedValues = Omit<
  RuleAction,
  'uuid' | 'alertsFilter' | 'actionTypeId'
> & {
  uuid: string;
  alertsFilter?: RawRuleAlertsFilter;
};

export type NormalizedAlertSystemActionWithGeneratedValues = Omit<
  RuleSystemAction,
  'uuid' | 'actionTypeId'
> & { uuid: string };

export type NormalizedAlertActionWithGeneratedValues =
  | NormalizedAlertDefaultActionWithGeneratedValues
  | NormalizedAlertSystemActionWithGeneratedValues;

export interface RegistryAlertTypeWithAuth extends RegistryRuleType {
  authorizedConsumers: string[];
}
export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export interface RuleBulkOperationAggregation {
  alertTypeId: {
    buckets: Array<{
      key: string[];
      doc_count: number;
    }>;
  };
}
export interface SavedObjectOptions {
  id?: string;
  migrationVersion?: Record<string, string>;
}

export interface ScheduleTaskOptions {
  id: string;
  consumer: string;
  ruleTypeId: string;
  schedule: IntervalSchedule;
  throwOnConflict: boolean; // whether to throw conflict errors or swallow them
}

export interface IndexType {
  [key: string]: unknown;
}

export interface MuteOptions extends IndexType {
  alertId: string;
  alertInstanceId: string;
}

export interface SnoozeOptions extends IndexType {
  snoozeSchedule: RuleSnoozeSchedule;
}

export interface BulkOptionsFilter {
  filter?: string | KueryNode;
}

export interface BulkOptionsIds {
  ids?: string[];
}

export type BulkOptions = BulkOptionsFilter | BulkOptionsIds;

export interface BulkOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

export type BulkAction = 'DELETE' | 'ENABLE' | 'DISABLE';

export interface RuleBulkOperationAggregation {
  alertTypeId: {
    buckets: Array<{
      key: string[];
      doc_count: number;
    }>;
  };
}

export type DenormalizedAction = DistributiveOmit<
  NormalizedAlertActionWithGeneratedValues,
  'id'
> & {
  actionRef: string;
  actionTypeId: string;
};
