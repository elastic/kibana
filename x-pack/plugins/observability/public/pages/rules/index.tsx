/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePluginContext } from '../../hooks/use_plugin_context';

import { loadAlerts as loadRules } from '../../../../triggers_actions_ui/public';

interface RuleState {
  data: [];
}
export function RulesPage() {
  const { core, ObservabilityPageTemplate } = usePluginContext();
  const {
    http,
    notifications: { toasts },
  } = core;
  const [rules, setRules] = useState<RuleState>({ data: [] });

  async function loadObservabilityRules() {
    try {
      const response = await loadRules({
        http,
        page: { index: 0, size: 10 },
        typesFilter: ['xpack.uptime.alerts.monitorStatus'],
      });
      setRules({
        data: response.data as any,
      });
    } catch (_e) {
      toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.ruleStats.loadError', {
          defaultMessage: 'Unable to load rules',
        }),
      });
    }
  }

  useEffect(() => {
    loadObservabilityRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rulesTableColumns = [
    {
      field: 'name',
      name: 'Rule Name',
    },
  ];
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: (
          <>{i18n.translate('xpack.observability.rulesTitle', { defaultMessage: 'Rules' })} </>
        ),
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiBasicTable items={rules.data} columns={rulesTableColumns} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
