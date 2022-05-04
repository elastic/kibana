/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useQuery } from 'react-query';

import { sendRequest } from '../../../hooks';

import { CodeBlock } from './code_block';

const fetchIndex = async (index?: string) => {
  if (!index) return;
  const path = `/${index}/_search`;
  const response = await sendRequest({
    method: 'post',
    path: `/api/console/proxy`,
    query: {
      path,
      method: 'GET',
    },
  });

  return response;
};

export const FleetIndicesDebugger = () => {
  const indices = [
    { label: '.fleet-agents', value: '.fleet-agents' },
    { label: '.fleet-actions', value: '.fleet-actions' },
  ];
  const [index, setIndex] = useState<string | undefined>();

  const { data: indexResult, status } = useQuery(
    ['debug-indices', index],
    () => fetchIndex(index),
    {
      retry: false,
    }
  );

  const selectedOptions = index ? [indices.find((option) => option.value === index)!] : [];

  return (
    <>
      <EuiTitle size="l">
        <h2>Fleet Indices</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiText grow={false}>
        <p>
          Search for the contents of Fleet indices. Use the code block below to diagnose any
          potential issues.
        </p>
      </EuiText>

      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiComboBox
              prepend="Index"
              aria-label="Select an index"
              placeholder="Select an index"
              fullWidth
              options={indices}
              singleSelection={{ asPlainText: true }}
              selectedOptions={selectedOptions}
              isLoading={status === 'loading'}
              onChange={(newSelectedOptions) => {
                if (!newSelectedOptions.length) {
                  setIndex(undefined);
                } else {
                  setIndex(newSelectedOptions[0].value as string);
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {indexResult?.error && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Error" color="danger">
            {(indexResult?.error as any)?.error?.reason ?? 'Error fetching index data'}
          </EuiCallOut>
        </>
      )}

      {indexResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(indexResult.data?.hits, null, 2)} />
        </>
      )}
    </>
  );
};
