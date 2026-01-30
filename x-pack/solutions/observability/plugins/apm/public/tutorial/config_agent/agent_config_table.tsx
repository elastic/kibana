/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ValuesType } from 'utility-types';
import { get } from 'lodash';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiFieldPassword, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { secretTokenKeys } from './commands/get_apm_agent_commands';

export function AgentConfigurationTable({
  variables,
  data,
}: {
  variables: { [key: string]: string };
  data: {
    apmServerUrl?: string;
    secretToken?: string;
    apmServiceName: string;
    apmEnvironment: string;
  };
}) {
  if (!variables) return null;

  const columns: Array<EuiBasicTableColumn<ValuesType<typeof items>>> = [
    {
      field: 'setting',
      name: i18n.translate('xpack.apm.tutorial.agent.column.configSettings', {
        defaultMessage: 'Configuration setting',
      }),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.apm.tutorial.agent.column.configValue', {
        defaultMessage: 'Configuration value',
      }),
      render: (_, { value, setting }) => {
        if (secretTokenKeys.includes(setting) && !!value)
          return <EuiFieldPassword type="dual" value={value ?? ''} data-test-subj="secret_key" />;
        return (
          <EuiText size="s" color="accent">
            {value}
          </EuiText>
        );
      },
    },
  ];

  const items = Object.keys(variables).map((k) => ({
    setting: variables[k],
    value: get(data, k), // TODO do we want default values?
  }));
  return (
    <EuiBasicTable
      items={items}
      columns={columns}
      tableCaption={i18n.translate('xpack.apm.tutorial.agent.configurationCaption', {
        defaultMessage: 'Agent configuration settings',
      })}
    />
  );
}
