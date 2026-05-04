/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { useFetcherV2, FETCH_STATUS } from '../../../hooks/use_fetcher_v2';

export function FooApm() {
  const [enabled, setEnabled] = useState(false);

  const { data, status } = useFetcherV2(
    (callApmApi) => {
      if (!enabled) {
        return;
      }
      return callApmApi('GET /internal/apm/foo/{serviceName}', {
        params: { path: { serviceName: 'my-service' }, query: { foo: 'bar' } },
        signal: null,
      });
    },
    [enabled]
  );
  console.log('### caue ~ FooApm ~ data:', data);

  return (
    <>
      <EuiButton data-test-subj="apmFooButton" onClick={() => setEnabled((prev) => !prev)}>
        {enabled ? 'Reset APM' : 'Fetch Foo APM'}
      </EuiButton>
      {status === FETCH_STATUS.LOADING && <EuiLoadingSpinner size="m" />}
      {status === FETCH_STATUS.SUCCESS && data && (
        <EuiText>
          <p>{data.msg}</p>
        </EuiText>
      )}
    </>
  );
}
