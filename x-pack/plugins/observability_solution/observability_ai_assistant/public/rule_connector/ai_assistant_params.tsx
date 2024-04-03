/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { ObsAIAssistantActionParams } from './types';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams>
> = ({ errors, index, messageVariables, editAction, actionParams }) => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        {i18n.translate('xpack.observabilityAiAssistant.alertConnector.selectLlmConnector', {
          defaultMessage: 'Connector',
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          data-test-subj="observabilityAiAssistantAlertConnectorSelect"
          options={[{ value: 'azure-open-ai', text: 'azure-open-ai' }]}
          value="azure-open-ai"
        />
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantParamsFields as default };
