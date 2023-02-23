/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ApiKeyBtn = ({
  isDisabled,
  apiKey,
  loading,
  setLoadAPIKey,
}: {
  loading?: boolean;
  isDisabled?: boolean;
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
            isDisabled={isDisabled}
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
    </>
  );
};

const GET_API_KEY_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getProjectApiKey.label',
  {
    defaultMessage: 'Generate Project API key',
  }
);

const GET_API_KEY_LOADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.loading',
  {
    defaultMessage: 'Generating API key',
  }
);
