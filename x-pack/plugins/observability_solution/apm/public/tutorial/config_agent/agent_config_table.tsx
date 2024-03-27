/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ValuesType } from 'utility-types';
import { get } from 'lodash';
import { EuiBasicTable, EuiText, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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
      render: (_, { value }) => (
        <EuiText size="s" color="accent">
          {value}
        </EuiText>
      ),
    },
  ];

  const items = Object.keys(variables).map((k) => ({
    setting: variables[k],
    value: get(data, k), // TODO do we want default values?
  }));
  return <EuiBasicTable items={items} columns={columns} />;
}
