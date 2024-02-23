/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ValuesType } from 'utility-types';
import { get } from 'lodash';
import {
  EuiBasicTable,
  EuiText,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  copyToClipboard,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
function ConfigurationValueColumn({
  columnKey,
  value,
  createApiKey,
  createApiKeyLoading,
}: {
  columnKey: string;
  value: string | null;
  createApiKey?: () => void;
  createApiKeyLoading?: boolean;
}) {
  const shouldRenderCreateApiKeyButton =
    columnKey === 'apiKey' && value === null;

  if (shouldRenderCreateApiKeyButton) {
    return (
      <EuiButton
        data-test-subj="createApiKeyAndId"
        fill
        onClick={createApiKey}
        isLoading={createApiKeyLoading}
      >
        {i18n.translate('xpack.apm.tutorial.apiKey.create', {
          defaultMessage: 'Create API Key',
        })}
      </EuiButton>
    );
  }

  return (
    <>
      <EuiText size="s" color="accent">
        {value}
      </EuiText>
      {value && (
        <EuiButtonIcon
          data-test-subj="apmConfigurationValueColumnButton"
          aria-label={i18n.translate(
            'xpack.apm.onboarding.column.value.copyIconText',
            {
              defaultMessage: 'Copy to clipboard',
            }
          )}
          color="text"
          iconType="copy"
          onClick={() => copyToClipboard(value)}
        />
      )}
    </>
  );
}

export function AgentConfigurationTable({
  variables,
  data,
  createApiKey,
  createApiKeyLoading,
}: {
  variables: { [key: string]: string };
  data: {
    apmServerUrl?: string;
    secretToken?: string;
    apiKey?: string | null;
  };
  createApiKey?: () => void;
  createApiKeyLoading?: boolean;
}) {
  if (!variables) return null;

  const defaultValues = {
    apmServiceName: 'my-service-name',
    apmEnvironment: 'my-environment',
  };

  const columns: Array<EuiBasicTableColumn<ValuesType<typeof items>>> = [
    {
      field: 'setting',
      name: i18n.translate('xpack.apm.onboarding.agent.column.configSettings', {
        defaultMessage: 'Configuration setting',
      }),
    },
    {
      field: 'value',
      name: i18n.translate('xpack.apm.onboarding.agent.column.configValue', {
        defaultMessage: 'Configuration value',
      }),
      render: (_, { value, key }) => (
        <ConfigurationValueColumn
          columnKey={key}
          value={value}
          createApiKey={createApiKey}
          createApiKeyLoading={createApiKeyLoading}
        />
      ),
    },
  ];

  const items = Object.entries(variables).map(([key, value]) => ({
    setting: value,
    value: get({ ...data, ...defaultValues }, key),
    key,
  }));
  return <EuiBasicTable items={items} columns={columns} />;
}
