/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  Rule,
  RuleType,
  RuleTaskState,
  AlertSummary,
  AlertingFrameworkHealth,
  ResolvedRule,
} from '../../../../types';
import {
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  muteAlerts,
  unmuteAlerts,
  disableAlert,
  enableAlert,
  muteAlert,
  unmuteAlert,
  muteAlertInstance,
  unmuteAlertInstance,
  loadAlert,
  loadAlertState,
  loadAlertSummary,
  loadAlertTypes,
  alertingFrameworkHealth,
  resolveRule,
} from '../../../lib/alert_api';
import { useKibana } from '../../../../common/lib/kibana';

export interface ComponentOpts {
  muteAlerts: (alerts: Rule[]) => Promise<void>;
  unmuteAlerts: (alerts: Rule[]) => Promise<void>;
  enableAlerts: (alerts: Rule[]) => Promise<void>;
  disableAlerts: (alerts: Rule[]) => Promise<void>;
  deleteAlerts: (alerts: Rule[]) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  muteAlert: (alert: Rule) => Promise<void>;
  unmuteAlert: (alert: Rule) => Promise<void>;
  muteAlertInstance: (alert: Rule, alertInstanceId: string) => Promise<void>;
  unmuteAlertInstance: (alert: Rule, alertInstanceId: string) => Promise<void>;
  enableAlert: (alert: Rule) => Promise<void>;
  disableAlert: (alert: Rule) => Promise<void>;
  deleteAlert: (alert: Rule) => Promise<{
    successes: string[];
    errors: string[];
  }>;
  loadAlert: (id: Rule['id']) => Promise<Rule>;
  loadAlertState: (id: Rule['id']) => Promise<RuleTaskState>;
  loadAlertSummary: (id: Rule['id'], numberOfExecutions?: number) => Promise<AlertSummary>;
  loadAlertTypes: () => Promise<RuleType[]>;
  getHealth: () => Promise<AlertingFrameworkHealth>;
  resolveRule: (id: Rule['id']) => Promise<ResolvedRule>;
}

export type PropsWithOptionalApiHandlers<T> = Omit<T, keyof ComponentOpts> & Partial<ComponentOpts>;

export function withBulkAlertOperations<T>(
  WrappedComponent: React.ComponentType<T & ComponentOpts>
): React.FunctionComponent<PropsWithOptionalApiHandlers<T>> {
  return (props: PropsWithOptionalApiHandlers<T>) => {
    const { http } = useKibana().services;
    return (
      <WrappedComponent
        {...(props as T)}
        muteAlerts={async (items: Rule[]) =>
          muteAlerts({
            http,
            ids: items.filter((item) => !isAlertMuted(item)).map((item) => item.id),
          })
        }
        unmuteAlerts={async (items: Rule[]) =>
          unmuteAlerts({ http, ids: items.filter(isAlertMuted).map((item) => item.id) })
        }
        enableAlerts={async (items: Rule[]) =>
          enableAlerts({ http, ids: items.filter(isAlertDisabled).map((item) => item.id) })
        }
        disableAlerts={async (items: Rule[]) =>
          disableAlerts({
            http,
            ids: items.filter((item) => !isAlertDisabled(item)).map((item) => item.id),
          })
        }
        deleteAlerts={async (items: Rule[]) =>
          deleteAlerts({ http, ids: items.map((item) => item.id) })
        }
        muteAlert={async (alert: Rule) => {
          if (!isAlertMuted(alert)) {
            return await muteAlert({ http, id: alert.id });
          }
        }}
        unmuteAlert={async (alert: Rule) => {
          if (isAlertMuted(alert)) {
            return await unmuteAlert({ http, id: alert.id });
          }
        }}
        muteAlertInstance={async (alert: Rule, instanceId: string) => {
          if (!isAlertInstanceMuted(alert, instanceId)) {
            return muteAlertInstance({ http, id: alert.id, instanceId });
          }
        }}
        unmuteAlertInstance={async (alert: Rule, instanceId: string) => {
          if (isAlertInstanceMuted(alert, instanceId)) {
            return unmuteAlertInstance({ http, id: alert.id, instanceId });
          }
        }}
        enableAlert={async (alert: Rule) => {
          if (isAlertDisabled(alert)) {
            return await enableAlert({ http, id: alert.id });
          }
        }}
        disableAlert={async (alert: Rule) => {
          if (!isAlertDisabled(alert)) {
            return await disableAlert({ http, id: alert.id });
          }
        }}
        deleteAlert={async (alert: Rule) => deleteAlerts({ http, ids: [alert.id] })}
        loadAlert={async (alertId: Rule['id']) => loadAlert({ http, alertId })}
        loadAlertState={async (alertId: Rule['id']) => loadAlertState({ http, alertId })}
        loadAlertSummary={async (ruleId: Rule['id'], numberOfExecutions?: number) =>
          loadAlertSummary({ http, ruleId, numberOfExecutions })
        }
        loadAlertTypes={async () => loadAlertTypes({ http })}
        resolveRule={async (ruleId: Rule['id']) => resolveRule({ http, ruleId })}
        getHealth={async () => alertingFrameworkHealth({ http })}
      />
    );
  };
}

function isAlertDisabled(alert: Rule) {
  return alert.enabled === false;
}

function isAlertMuted(alert: Rule) {
  return alert.muteAll === true;
}

function isAlertInstanceMuted(alert: Rule, instanceId: string) {
  return alert.mutedInstanceIds.findIndex((muted) => muted === instanceId) >= 0;
}
