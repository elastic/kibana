/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexItem, EuiSelect, EuiSpacer, EuiTextArea } from '@elastic/eui';
import {
  ObservabilityAIAssistantService,
  useGenAIConnectorsWithoutContext,
} from '@kbn/observability-ai-assistant-plugin/public';
import { ObsAIAssistantActionParams } from './types';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams> & { service: ObservabilityAIAssistantService }
> = ({ errors, index, messageVariables, editAction, actionParams, service }) => {
  const { connectors, loading, selectConnector, selectedConnector } =
    useGenAIConnectorsWithoutContext(service);

  useEffect(() => {
    editAction('connector', selectedConnector, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnector, index]);

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.observabilityAiAssistant.alertConnector.selectLlmConnector', {
          defaultMessage: 'Connector',
        })}
      >
        <EuiSelect
          fullWidth
          data-test-subj="observabilityAiAssistantAlertConnectorSelect"
          isLoading={loading}
          isInvalid={errors.connector?.length > 0}
          options={connectors?.map((connector) => {
            return { value: connector.id, text: connector.name };
          })}
          onChange={(event) => {
            selectConnector(event.target.value);
            editAction('connector', event.target.value, index);
          }}
          value={selectedConnector}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.observabilityAiAssistant.alertConnector.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiFlexItem grow={false}>
          <EuiTextArea
            fullWidth
            data-test-subj="observabilityAiAssistantAlertConnectorMessageTextArea"
            value={actionParams.message}
            onChange={(event) => {
              editAction('message', event.target.value, index);
            }}
            isInvalid={errors.message?.length > 0}
          />
        </EuiFlexItem>
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantParamsFields as default };
