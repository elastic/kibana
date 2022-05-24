/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButton, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { fetchServiceAPIKey } from '../../legacy_uptime/state/api';

export const GetApiKeyBtn = () => {
  const [loadAPIKey, setLoadAPIKey] = useState(false);

  const { data, loading } = useFetcher(async () => {
    if (loadAPIKey) {
      return fetchServiceAPIKey();
    }
    return null;
  }, [loadAPIKey]);

  return (
    <>
      <EuiSpacer />
      <EuiButton
        fill
        isLoading={loading}
        color="primary"
        onClick={() => {
          setLoadAPIKey(true);
        }}
      >
        {GET_API_KEY_LABEL}
      </EuiButton>
      <EuiSpacer />
      {data && (
        <EuiCodeBlock language="javascript" isCopyable>
          {data?.apiKey.encoded}
        </EuiCodeBlock>
      )}
    </>
  );
};

const GET_API_KEY_LABEL = i18n.translate('xpack.uptime.monitorManagement.getAPIKeyLabel', {
  defaultMessage: 'Get API key',
});
