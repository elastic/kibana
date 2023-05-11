/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiTitle } from '@elastic/eui';
import { useFetcher } from '../../../hooks/use_fetcher';

export function DiagnosticsInvalidFieldMappings() {
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/invalid_field_mappings`);
  }, []);

  if (!data?.invalidFieldMappings.length) {
    return (
      <EuiTitle size="s">
        <h2>
          <EuiIcon size="m" type="check" /> Field mappings are correct
        </h2>
      </EuiTitle>
    );
  }

  return <pre>{JSON.stringify(data?.invalidFieldMappings, null, 4)}</pre>;
}
