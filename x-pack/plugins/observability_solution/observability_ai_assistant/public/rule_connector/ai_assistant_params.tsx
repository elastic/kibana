/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ObsAIAssistantActionParams } from './types';
import { ObservabilityAIAssistantService } from '../types';
import { useGenAIConnectorsWithoutContext } from '../hooks/use_genai_connectors';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams> & { service: ObservabilityAIAssistantService }
> = ({ errors, index, messageVariables, editAction, actionParams, service }) => {
  const { connectors, loading, selectConnector, selectedConnector } =
    useGenAIConnectorsWithoutContext(service);

  useEffect(() => {
    editAction('connector', selectedConnector, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <EuiFlexItem grow={false}>
        <TextAreaWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'message'}
          inputTargetValue={actionParams.message}
          label={i18n.translate(
            'xpack.observabilityAiAssistant.alertConnector.messageTextAreaFieldLabel',
            {
              defaultMessage: 'Message',
            }
          )}
          errors={(errors.text ?? []) as string[]}
        />
      </EuiFlexItem>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantParamsFields as default };
