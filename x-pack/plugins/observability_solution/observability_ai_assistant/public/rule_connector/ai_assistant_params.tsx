/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables, useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ObsAIAssistantActionParams } from './types';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams>
> = ({ errors, index, messageVariables, editAction, actionParams }) => {
  const { http } = useKibana().services;

  const [loading, setLoading] = useState(false);
  const [connectors, setConnectors] = useState<FindActionResult[] | undefined>(undefined);
  const [selectedConnector, setSelectedConnector] = useState('');

  useEffect(() => {
    setLoading(true);

    http
      .get<FindActionResult[]>('/internal/observability_ai_assistant/connectors')
      .then((results) => {
        setConnectors(results);
      })
      .catch((err) => {
        setConnectors(undefined);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [http]);

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
            setSelectedConnector(event.target.value);
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
