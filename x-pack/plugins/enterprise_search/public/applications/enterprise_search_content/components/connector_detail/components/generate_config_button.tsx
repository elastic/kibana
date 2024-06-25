/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface GenerateConfigButtonProps {
  connectorId: string;
  generateConfiguration: (params: { connectorId: string }) => void;
  isGenerateLoading: boolean;
}
export const GenerateConfigButton: React.FC<GenerateConfigButtonProps> = ({
  connectorId,
  generateConfiguration,
  isGenerateLoading,
}) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="entSearchContent-connector-configuration-generateConfigButton"
          data-telemetry-id="entSearchContent-connector-configuration-generateConfigButton"
          fill
          iconType="sparkles"
          isLoading={isGenerateLoading}
          onClick={() => {
            generateConfiguration({ connectorId });
          }}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.button.label',
            {
              defaultMessage: 'Generate configuration',
            }
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
