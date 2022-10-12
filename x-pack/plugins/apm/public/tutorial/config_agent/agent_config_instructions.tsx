/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import {
  EuiCodeBlock,
  EuiSpacer,
  EuiBasicTable,
  EuiText,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { OpenTelemetryInstructions } from './opentelemetry_instructions';
import {
  getApmAgentCommands,
  getApmAgentVariables,
} from './commands/get_apm_agent_commands';
import { i18n } from '@kbn/i18n';

export function AgentConfigInstructions({
  variantId,
  apmServerUrl,
  secretToken,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
}) {
  const defaultValues = {
    apmServiceName: 'my-service-name',
    apmEnvironment: 'production',
  };

  if (variantId === 'openTelemetry') {
    return (
      <>
        <EuiSpacer />
        <OpenTelemetryInstructions
          apmServerUrl={apmServerUrl}
          secretToken={secretToken}
        />
      </>
    );
  }

  const commands = getApmAgentCommands({
    variantId,
    policyDetails: {
      apmServerUrl,
      secretToken,
    },
    defaultValues,
  });

  const variables = getApmAgentVariables(variantId);

  return (
    <>
      <EuiSpacer />
      <AgentConfigurationTable
        variables={variables}
        data={{ apmServerUrl, secretToken, ...defaultValues }}
      />
      <EuiSpacer />

      <EuiCodeBlock isCopyable language="bash" data-test-subj="commands">
        {commands}
      </EuiCodeBlock>
    </>
  );
}

// TODO move it seperatly and fix types
function AgentConfigurationTable({ variables, data }) {
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
      render: (_, { value }) => <EuiText color="accent">{value}</EuiText>,
    },
  ];

  const items = Object.keys(variables).map((k) => ({
    setting: variables[k],
    value: get(data, k), // TODO do we want default values?
  }));

  return <EuiBasicTable items={items} columns={columns}></EuiBasicTable>;
}
