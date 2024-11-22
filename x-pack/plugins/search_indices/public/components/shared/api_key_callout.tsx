/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ApiKeyForm } from '@kbn/search-api-keys-components';

interface APIKeyCalloutProps {
  apiKey: string | null;
}

export const APIKeyCallout = ({ apiKey }: APIKeyCalloutProps) => {
  const title = apiKey
    ? i18n.translate('xpack.searchIndices.shared.codeView.apiKeyTitle', {
        defaultMessage: 'Copy your API key',
      })
    : i18n.translate('xpack.searchIndices.shared.codeView.explicitGenerate.apiKeyTitle', {
        defaultMessage: 'Create an API key',
      });

  const description = apiKey
    ? i18n.translate('xpack.searchIndices.shared.codeView.apiKeyDescription', {
        defaultMessage:
          'Make sure you keep it somewhere safe. You won’t be able to retrieve it later.',
      })
    : i18n.translate('xpack.searchIndices.shared.codeView.explicitGenerate.apiKeyDescription', {
        defaultMessage: 'Create an API key to connect to Elasticsearch.',
      });

  const dataTestSubj = apiKey ? 'apiKeyHasBeenGenerated' : 'apiKeyHasNotBeenGenerated';

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder={true}
      color="plain"
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiText>
            <h5>{title}</h5>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued">
            <p>{description}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ApiKeyForm hasTitle={false} />
    </EuiPanel>
  );
};
