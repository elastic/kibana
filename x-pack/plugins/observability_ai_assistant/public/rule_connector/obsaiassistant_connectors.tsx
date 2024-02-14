/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';

const ObsAIAssistantActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({}) => {
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
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantActionFields as default };
