/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { IExecutionLogWithErrorsResult } from '@kbn/alerting-plugin/common';
import {
  Rule,
  RuleType,
  RuleTaskState,
  RuleSummary,
  AlertingFrameworkHealth,
  ResolvedRule,
} from '../../../../types';
import {
  deleteRules,
  disableRules,
  enableRules,
  muteRules,
  unmuteRules,
  disableRule,
  enableRule,
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
  LoadExecutionLogAggregationsProps,
  snoozeRule,
  unsnoozeRule,
  loadMonitoring,
} from '../../../lib/rule_api';
import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  muteRules: (rules: Rule[]) => Promise<void>;
  unmuteRules: (rules: Rule[]) => Promise<void>;
  enableRules: (rules: Rule[]) => Promise<void>;
  disableRules: (rules: Rule[]) => Promise<void>;
  deleteRules: (rules: Rule[]) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  muteRule: (rule: Rule) => Promise<void>;
  unmuteRule: (rule: Rule) => Promise<void>;
  muteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  unmuteAlertInstance: (rule: Rule, alertInstanceId: string) => Promise<void>;
  enableRule: (rule: Rule) => Promise<void>;
  disableRule: (rule: Rule) => Promise<void>;
  deleteRule: (rule: Rule) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  loadRule: (id: Rule['id']) => Promise<Rule>;
  loadRuleState: (id: Rule['id']) => Promise<RuleTaskState>;
  loadRuleSummary: (id: Rule['id'], numberOfExecutions?: number) => Promise<RuleSummary>;
  loadRuleTypes: () => Promise<RuleType[]>;
  loadExecutionLogAggregations: (
    props: LoadExecutionLogAggregationsProps
  ) => Promise<IExecutionLogWithErrorsResult>;
  getHealth: () => Promise<AlertingFrameworkHealth>;
  resolveRule: (id: Rule['id']) => Promise<ResolvedRule>;
  snoozeRule: (rule: Rule, snoozeEndTime: string | -1) => Promise<void>;
  unsnoozeRule: (rule: Rule) => Promise<void>;
  loadMonitoring: (id: Rule['id']) => Promise<any>;
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
        enableRules={async (items: Rule[]) =>
          enableRules({ http, ids: items.filter(isRuleDisabled).map((item) => item.id) })
        }
        disableRules={async (items: Rule[]) =>
          disableRules({
            http,
            ids: items.filter((item) => !isRuleDisabled(item)).map((item) => item.id),
          })
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
        enableRule={async (rule: Rule) => {
          if (isRuleDisabled(rule)) {
            return await enableRule({ http, id: rule.id });
          }
        }}
        disableRule={async (rule: Rule) => {
          if (!isRuleDisabled(rule)) {
            return await disableRule({ http, id: rule.id });
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
        resolveRule={async (ruleId: Rule['id']) => resolveRule({ http, ruleId })}
        getHealth={async () => alertingFrameworkHealth({ http })}
        snoozeRule={async (rule: Rule, snoozeEndTime: string | -1) => {
          return await snoozeRule({ http, id: rule.id, snoozeEndTime });
        }}
        unsnoozeRule={async (rule: Rule) => {
          return await unsnoozeRule({ http, id: rule.id });
        }}
        loadMonitoring={async (ruleId: Rule['id']) => loadMonitoring({ http, ruleId })}
      />
    );
  };
}

function isRuleDisabled(rule: Rule) {
  return rule.enabled === false;
}

function isRuleMuted(rule: Rule) {
  return rule.muteAll === true;
}

function isAlertInstanceMuted(rule: Rule, instanceId: string) {
  return rule.mutedInstanceIds.findIndex((muted) => muted === instanceId) >= 0;
}
