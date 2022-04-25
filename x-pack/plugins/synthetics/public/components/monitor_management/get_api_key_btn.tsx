/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButton, EuiCodeBlock } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-plugin/public';
import { fetchServiceAPIKey } from '../../state/api';

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
      <EuiButton
        fill
        isLoading={loading}
        color="primary"
        onClick={() => {
          setLoadAPIKey(true);
        }}
      >
        Get API key
      </EuiButton>
      {data && (
        <EuiCodeBlock language="javascript" isCopyable>
          {data?.apiKey.encoded}
        </EuiCodeBlock>
      )}
    </>
  );
};
