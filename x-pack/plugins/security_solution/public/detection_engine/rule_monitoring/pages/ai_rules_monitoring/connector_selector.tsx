/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';
import type { AIConnector } from '@kbn/elastic-assistant/impl/connectorland/connector_selector';
import type { Provider } from '@kbn/elastic-assistant-common/impl/schemas/conversations/common_attributes.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { useAiRulesMonitoringContext } from './ai_rules_monitoring_context';

export function ConnectorSelector(): JSX.Element {
  const {
    http,
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;
  const {
    data: aiConnectors,
    isLoading,
    isFetching,
  } = useLoadConnectors({ actionTypeRegistry, http });
  const { currentApiConfig, updateApiConfig } = useAiRulesMonitoringContext();

  const connectorOptions = useMemo<Array<EuiComboBoxOptionOption<AIConnector>>>(
    () =>
      (aiConnectors ?? []).map((aiConnector) => ({
        key: aiConnector.id,
        label: `${aiConnector.name} (${aiConnector.id.substring(0, 6)})`,
        value: aiConnector,
      })),
    [aiConnectors]
  );
  const selectedOptions = useMemo(
    () => connectorOptions.filter((x) => x.key === currentApiConfig?.connectorId),
    [connectorOptions, currentApiConfig]
  );
  const handleChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<AIConnector>>) => {
      if (!options[0]?.value) {
        return;
      }

      const connector = options[0]?.value;
      const connectorConfig = 'config' in connector ? connector.config : undefined;

      updateApiConfig({
        connectorId: connector.id,
        connectorTypeTitle: connector.connectorTypeTitle,
        defaultSystemPromptId: currentApiConfig?.defaultSystemPromptId,
        provider: connectorConfig?.apiProvider as Provider | undefined,
        model: connectorConfig?.defaultModel as string | undefined,
      });
    },
    [currentApiConfig, updateApiConfig]
  );

  return (
    <>
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        isClearable={false}
        isLoading={isLoading || isFetching}
        onChange={handleChange}
        options={connectorOptions}
        selectedOptions={selectedOptions}
      />
    </>
  );
}
