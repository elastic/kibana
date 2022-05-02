/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';

import { useQuery } from 'react-query';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { sendGetAgentPolicies, useLink } from '../../../hooks';
import { SO_SEARCH_LIMIT } from '../../../constants';

import { CodeBlock } from './code_block';

const fetchAgentPolicies = async () => {
  const response = await sendGetAgentPolicies({
    full: true,
    perPage: SO_SEARCH_LIMIT,
    sortOrder: 'asc',
  });

  return response;
};

export const AgentPolicyDebugger: React.FunctionComponent = () => {
  const { getHref } = useLink();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>();

  // TODO: Depending on the number of agent policies, this might need to be switched to
  // `useInfinite` query with an infinite scrolling approach in the dropdown options.
  const { data, status } = useQuery('agent-policies', fetchAgentPolicies);

  const agentPolicies = data?.data?.items ?? [];
  const comboBoxOptions = agentPolicies.map((policy) => ({ label: policy.name, value: policy.id }));
  const selectedOptions = selectedPolicyId
    ? [comboBoxOptions.find((option) => option.value === selectedPolicyId)!]
    : [];

  if (status === 'loading') {
    return <EuiLoadingSpinner />;
  }

  if (status === 'error') {
    return (
      <EuiCallOut title="Error" color="danger">
        Error fetching Agent Policies
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiTitle size="l">
        <h2>Agent Policy Debugger</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiComboBox
        aria-label="Select an Agent Policy"
        placeholder="Select an Agent Policy"
        options={comboBoxOptions}
        singleSelection={{ asPlainText: true }}
        selectedOptions={selectedOptions}
        onChange={(newSelectedOptions) => {
          // Handle "clear" action
          if (!newSelectedOptions.length) {
            setSelectedPolicyId(undefined);
          } else {
            setSelectedPolicyId(newSelectedOptions[0].value);
          }
        }}
      />

      {selectedPolicyId && (
        <>
          <EuiSpacer size="m" />

          <EuiLink target="_blank" href={getHref('policy_details', { policyId: selectedPolicyId })}>
            View Agent Policy in Fleet UI
          </EuiLink>

          <EuiSpacer size="m" />

          <CodeBlock
            value={JSON.stringify(
              agentPolicies.find((policy) => policy.id === selectedPolicyId),
              null,
              2
            )}
          />
        </>
      )}
    </>
  );
};
