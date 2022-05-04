/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef } from 'react';
import { useQuery } from 'react-query';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { sendRequest } from '../../../hooks';

import { CodeBlock } from './code_block';
import { SavedObjectNamesCombo } from './saved_object_names_combo';

const fetchSavedObjects = async (type?: string, name?: string) => {
  if (!type || !name) return;
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
  const [name, setName] = useState<string | undefined>();
  const [namesStatus, setNamesStatus] = useState();

  const childRef = useRef<{ refetchNames: Function }>();

  const onTypeChange = (e: any) => {
    setType(e.target.value);
    setName(undefined);
    childRef.current!.refetchNames();
  };

  const { data: savedObjectResult, status } = useQuery(['debug-saved-objects', type, name], () =>
    fetchSavedObjects(type, name)
  );

  return (
    <>
      <EuiTitle size="l">
        <h2>Saved Objects</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiText grow={false}>
        <p>
          Search for Saved objects by selecting a type and its name. Use the code block below to
          diagnose any potential issues.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems="center" justifyContent="flexStart">
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 300px;
          `}
        >
          <EuiFormRow>
            <EuiSelect
              prepend="Type"
              id="soType"
              options={types}
              value={type}
              onChange={(e) => onTypeChange(e)}
              aria-label="Use aria labels when no actual label is in use"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={`
            min-width: 400px;
          `}
        >
          <EuiFormRow>
            <SavedObjectNamesCombo
              name={name!}
              setName={setName}
              type={type}
              setNamesStatus={setNamesStatus}
              ref={childRef}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      {(status === 'error' || namesStatus === 'error') && (
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
