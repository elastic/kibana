/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiIcon, EuiText, EuiTitle } from '@elastic/eui';
import { useFetcher } from '../../../hooks/use_fetcher';

export function DiagnosticsInvalidFieldMappings() {
  const { data } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/invalid_field_mappings`);
  }, []);

  if (!data?.invalidFieldMappings.length) {
    return (
      <EuiTitle size="s">
        <h2>
          <EuiIcon size="m" type="check" /> No invalid field mappings detected
        </h2>
      </EuiTitle>
    );
  }

  return (
    <>
      <EuiText>
        The following indices does not have the right mapping for
        <EuiCode>service.name</EuiCode>:
        <ul css={{ listStyleType: 'circle' }}>
          {data?.invalidFieldMappings
            .flatMap(({ indices }) => indices)
            .map((indexName) => (
              <li>{indexName}</li>
            ))}
        </ul>
      </EuiText>
    </>
  );
}
