/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const GetApiKeyBtn = ({
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
      <EuiSpacer />
      <EuiButton
        fill
        fullWidth={true}
        isLoading={loading}
        color="primary"
        onClick={() => {
          setLoadAPIKey(true);
        }}
      >
        {loading ? GET_API_KEY_LOADING_LABEL : GET_API_KEY_LABEL}
      </EuiButton>
      <EuiSpacer />
      {apiKey && (
        <EuiText size="xs">
          <h3>{API_KEY_LABEL}</h3>
        </EuiText>
      )}
      {apiKey && (
        <EuiCodeBlock language="javascript" isCopyable>
          {apiKey}
        </EuiCodeBlock>
      )}
    </>
  );
};

const API_KEY_LABEL = i18n.translate('xpack.uptime.monitorManagement.apiKey.label', {
  defaultMessage: 'API key',
});

const GET_API_KEY_LABEL = i18n.translate('xpack.uptime.monitorManagement.getAPIKeyLabel', {
  defaultMessage: 'Generate API key',
});

const GET_API_KEY_LOADING_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.getAPIKeyLabel.loading',
  {
    defaultMessage: 'Generating API key',
  }
);
