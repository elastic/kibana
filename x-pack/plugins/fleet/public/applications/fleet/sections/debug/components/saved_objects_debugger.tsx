/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiFieldText,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { sendRequest } from '../../../hooks';

import { CodeBlock } from './code_block';

const fetchSavedObjects = async (type: string, name: string) => {
  const path = `/.kibana/_search?q=${type}.name:${name}`;
  const body = {};
  const response = await sendRequest({
    method: 'post',
    path: `/api/console/proxy`,
    query: {
      path,
      method: 'GET',
    },
    body,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.data?.hits;
};

export const SavedObjectsDebugger: React.FunctionComponent = () => {
  const types = [
    { value: 'ingest-agent-policies', text: 'Agent policy' },
    { value: 'ingest-package-policies', text: 'Integration policy' },
    { value: 'ingest-outputs', text: 'Output' },
    { value: 'epm-packages', text: 'Packages' },
  ];

  const [type, setType] = useState(types[0].value);
  const [name, setName] = useState('');

  const onTypeChange = (e) => {
    setType(e.target.value);
  };

  const onNameChange = (e) => {
    setName(e.target.value);
  };

  const {
    data: savedObjectResult,
    refetch,
    status,
  } = useQuery(['debug-saved-objects', type, name], () => fetchSavedObjects(type, name), {
    enabled: false,
    refetchOnWindowFocus: false,
  });

  const onClick = async () => {
    refetch();
  };
  return (
    <>
      <EuiTitle size="l">
        <h2>Saved Objects Debugger</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText grow={false}>
        <p>
          Search for Saved objects by selecting a type and searching for its name. Use the code
          block below to diagnose any potential issues.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSelect
              id="soType"
              options={types}
              value={type}
              onChange={(e) => onTypeChange(e)}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiFieldText value={name} onChange={(e) => onNameChange(e)} />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiButton onClick={onClick} fill disabled={!name}>
              Search
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {status === 'error' && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Error" color="danger">
            Error fetching Saved Objects
          </EuiCallOut>
        </>
      )}

      {savedObjectResult && (
        <>
          <EuiSpacer size="m" />
          <CodeBlock value={JSON.stringify(savedObjectResult, null, 2)} />
        </>
      )}
    </>
  );
};
