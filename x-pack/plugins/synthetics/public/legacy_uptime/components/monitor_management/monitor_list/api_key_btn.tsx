/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ApiKeyBtn = ({
  apiKey,
  loading,
  setLoadAPIKey,
}: {
  loading?: boolean;
  apiKey?: string;
  setLoadAPIKey: (val: boolean) => void;
}) => {
  return (
    <>
      <EuiSpacer size="m" />
      {!apiKey && (
        <>
          <EuiButton
            fill
            fullWidth={true}
            isLoading={loading}
            color="primary"
            onClick={() => {
              setLoadAPIKey(true);
            }}
            data-test-subj="uptimeMonitorManagementApiKeyGenerate"
          >
            {loading ? GET_API_KEY_LOADING_LABEL : GET_API_KEY_LABEL}
          </EuiButton>
          <EuiSpacer size="s" />
        </>
      )}
      {apiKey && (
        <>
          <EuiCallOut title={API_KEY_WARNING_LABEL} iconType="iInCircle" size="s" />
          <EuiSpacer size="s" />
          <EuiText size="s">
            <strong>{API_KEY_LABEL}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="javascript"
            isCopyable
            fontSize="s"
            paddingSize="m"
            whiteSpace="pre"
          >
            {apiKey}
          </EuiCodeBlock>
        </>
      )}
    </>
  );
};

const API_KEY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.apiKey.label', {
  defaultMessage: 'API key',
});

const GET_API_KEY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.getApiKey.label', {
  defaultMessage: 'Generate API key',
});

const API_KEY_WARNING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.apiKeyWarning.label',
  {
    defaultMessage:
      'This API key will only be shown once. Please keep a copy for your own records.',
  }
);

const GET_API_KEY_LOADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.loading',
  {
    defaultMessage: 'Generating API key',
  }
);
