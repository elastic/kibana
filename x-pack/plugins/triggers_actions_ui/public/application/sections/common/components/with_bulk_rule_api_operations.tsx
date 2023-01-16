/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  IExecutionLogResult,
  IExecutionErrorsResult,
  IExecutionKPIResult,
} from '@kbn/alerting-plugin/common';
import { KueryNode } from '@kbn/es-query';
import {
  Rule,
  RuleType,
  RuleTaskState,
  RuleSummary,
  AlertingFrameworkHealth,
  ResolvedRule,
  SnoozeSchedule,
  BulkEditResponse,
  BulkDeleteResponse,
  BulkOperationResponse,
  BulkOperationAttributesWithoutHttp,
} from '../../../../types';
import {
  deleteRules,
  muteRules,
  unmuteRules,
  muteRule,
  unmuteRule,
  muteAlertInstance,
  unmuteAlertInstance,
  loadRule,
  loadRuleState,
  loadRuleSummary,
  loadRuleTypes,
  alertingFrameworkHealth,
  resolveRule,
  loadExecutionLogAggregations,
  loadGlobalExecutionLogAggregations,
  LoadExecutionLogAggregationsProps,
  LoadGlobalExecutionLogAggregationsProps,
  loadActionErrorLog,
  LoadActionErrorLogProps,
  snoozeRule,
  bulkSnoozeRules,
  BulkSnoozeRulesProps,
  unsnoozeRule,
  loadExecutionKPIAggregations,
  LoadExecutionKPIAggregationsProps,
  loadGlobalExecutionKPIAggregations,
  LoadGlobalExecutionKPIAggregationsProps,
  bulkUnsnoozeRules,
  BulkUnsnoozeRulesProps,
  cloneRule,
  bulkDeleteRules,
  bulkEnableRules,
  bulkDisableRules,
} from '../../../lib/rule_api';
import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  muteRules: (rules: Rule[]) => Promise<void>;
  unmuteRules: (rules: Rule[]) => Promise<void>;
  deleteRules: (rules: Rule[]) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  muteRule: (rule: Rule) => Promise<void>;
  unmuteRule: (rule: Rule) => Promise<void>;
  muteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  unmuteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  deleteRule: (rule: Rule) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  loadRule: (id: Rule['id']) => Promise<Rule>;
  loadRuleState: (id: Rule['id']) => Promise<RuleTaskState>;
  loadRuleSummary: (id: Rule['id'], numberOfExecutions?: number) => Promise<RuleSummary>;
  loadRuleTypes: () => Promise<RuleType[]>;
  loadExecutionKPIAggregations: (
    props: LoadExecutionKPIAggregationsProps
  ) => Promise<IExecutionKPIResult>;
  loadExecutionLogAggregations: (
    props: LoadExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalExecutionLogAggregations: (
    props: LoadGlobalExecutionLogAggregationsProps
  ) => Promise<IExecutionLogResult>;
  loadGlobalExecutionKPIAggregations: (
    props: LoadGlobalExecutionKPIAggregationsProps
  ) => Promise<IExecutionKPIResult>;
  loadActionErrorLog: (props: LoadActionErrorLogProps) => Promise<IExecutionErrorsResult>;
  getHealth: () => Promise<AlertingFrameworkHealth>;
  resolveRule: (id: Rule['id']) => Promise<ResolvedRule>;
  snoozeRule: (rule: Rule, snoozeSchedule: SnoozeSchedule) => Promise<void>;
  bulkSnoozeRules: (props: BulkSnoozeRulesProps) => Promise<BulkEditResponse>;
  unsnoozeRule: (rule: Rule, scheduleIds?: string[]) => Promise<void>;
  bulkUnsnoozeRules: (props: BulkUnsnoozeRulesProps) => Promise<BulkEditResponse>;
  cloneRule: (ruleId: string) => Promise<Rule>;
  bulkDeleteRules: (props: {
    filter?: KueryNode | null;
    ids?: string[];
  }) => Promise<BulkDeleteResponse>;
  bulkEnableRules: (props: BulkOperationAttributesWithoutHttp) => Promise<BulkOperationResponse>;
  bulkDisableRules: (props: BulkOperationAttributesWithoutHttp) => Promise<BulkOperationResponse>;
}

export type PropsWithOptionalApiHandlers<T> = Omit<T, keyof ComponentOpts> & Partial<ComponentOpts>;

export function withBulkRuleOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    const { http } = useKibana().services;
    return (
      <WrappedComponent
        {...(props as T)}
        muteRules={async (items: Rule[]) =>
          muteRules({
            http,
            ids: items.filter((item) => !isRuleMuted(item)).map((item) => item.id),
          })
        }
        unmuteRules={async (items: Rule[]) =>
          unmuteRules({ http, ids: items.filter(isRuleMuted).map((item) => item.id) })
        }
        deleteRules={async (items: Rule[]) =>
          deleteRules({ http, ids: items.map((item) => item.id) })
        }
        muteRule={async (rule: Rule) => {
          if (!isRuleMuted(rule)) {
            return await muteRule({ http, id: rule.id });
          }
        }}
        unmuteRule={async (rule: Rule) => {
          if (isRuleMuted(rule)) {
            return await unmuteRule({ http, id: rule.id });
          }
        }}
        muteAlertInstance={async (rule: Rule, instanceId: string) => {
          if (!isAlertInstanceMuted(rule, instanceId)) {
            return muteAlertInstance({ http, id: rule.id, instanceId });
          }
        }}
        unmuteAlertInstance={async (rule: Rule, instanceId: string) => {
          if (isAlertInstanceMuted(rule, instanceId)) {
            return unmuteAlertInstance({ http, id: rule.id, instanceId });
          }
        }}
        deleteRule={async (rule: Rule) => deleteRules({ http, ids: [rule.id] })}
        loadRule={async (ruleId: Rule['id']) => loadRule({ http, ruleId })}
        loadRuleState={async (ruleId: Rule['id']) => loadRuleState({ http, ruleId })}
        loadRuleSummary={async (ruleId: Rule['id'], numberOfExecutions?: number) =>
          loadRuleSummary({ http, ruleId, numberOfExecutions })
        }
        loadRuleTypes={async () => loadRuleTypes({ http })}
        loadExecutionLogAggregations={async (loadProps: LoadExecutionLogAggregationsProps) =>
          loadExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadGlobalExecutionLogAggregations={async (
          loadProps: LoadGlobalExecutionLogAggregationsProps
        ) =>
          loadGlobalExecutionLogAggregations({
            ...loadProps,
            http,
          })
        }
        loadActionErrorLog={async (loadProps: LoadActionErrorLogProps) =>
          loadActionErrorLog({
            ...loadProps,
            http,
          })
        }
        loadExecutionKPIAggregations={async (
          loadExecutionKPIAggregationProps: LoadExecutionKPIAggregationsProps
        ) =>
          loadExecutionKPIAggregations({
            ...loadExecutionKPIAggregationProps,
            http,
          })
        }
        loadGlobalExecutionKPIAggregations={async (
          loadGlobalExecutionKPIAggregationsProps: LoadGlobalExecutionKPIAggregationsProps
        ) =>
          loadGlobalExecutionKPIAggregations({
            ...loadGlobalExecutionKPIAggregationsProps,
            http,
          })
        }
        resolveRule={async (ruleId: Rule['id']) => resolveRule({ http, ruleId })}
        getHealth={async () => alertingFrameworkHealth({ http })}
        snoozeRule={async (rule: Rule, snoozeSchedule: SnoozeSchedule) => {
          return await snoozeRule({ http, id: rule.id, snoozeSchedule });
        }}
        bulkSnoozeRules={async (bulkSnoozeRulesProps: BulkSnoozeRulesProps) => {
          return await bulkSnoozeRules({ http, ...bulkSnoozeRulesProps });
        }}
        unsnoozeRule={async (rule: Rule, scheduleIds?: string[]) => {
          return await unsnoozeRule({ http, id: rule.id, scheduleIds });
        }}
        bulkUnsnoozeRules={async (bulkUnsnoozeRulesProps: BulkUnsnoozeRulesProps) => {
          return await bulkUnsnoozeRules({ http, ...bulkUnsnoozeRulesProps });
        }}
        cloneRule={async (ruleId: string) => {
          return await cloneRule({ http, ruleId });
        }}
        bulkDeleteRules={async (bulkDeleteProps: { filter?: KueryNode | null; ids?: string[] }) => {
          return await bulkDeleteRules({ http, ...bulkDeleteProps });
        }}
        bulkEnableRules={async (bulkEnableProps: BulkOperationAttributesWithoutHttp) => {
          return await bulkEnableRules({ http, ...bulkEnableProps });
        }}
        bulkDisableRules={async (bulkDisableProps: BulkOperationAttributesWithoutHttp) => {
          return await bulkDisableRules({ http, ...bulkDisableProps });
        }}
      />
    );
  };
}

function isRuleMuted(rule: Rule) {
  return rule.muteAll === true;
}

function isAlertInstanceMuted(rule: Rule, instanceId: string) {
  return rule.mutedInstanceIds.findIndex((muted) => muted === instanceId) >= 0;
}
