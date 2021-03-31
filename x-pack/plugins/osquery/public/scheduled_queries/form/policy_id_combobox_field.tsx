/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name, @typescript-eslint/no-non-null-assertion */

import { mapKeys } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { ComboBoxField, FieldHook } from '../../shared_imports';
import { useAgentPolicies } from '../../agent_policies';

// Custom styling for drop down list items due to:
//  1) the max-width and overflow properties is added to prevent long agent policy
//     names/descriptions from overflowing the flex items
//  2) max-width is built from the grow property on the flex items because the value
//     changes based on if Fleet is enabled/setup or not
const AgentPolicyNameColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;
const AgentPolicyDescriptionColumn = styled(EuiFlexItem)`
  max-width: ${(props) => `${((props.grow as number) / 9) * 100}%`};
  overflow: hidden;
`;

interface PropsRepositoryCombobox {
  field: FieldHook<string[]>;
  isLoading: boolean;
  repos: string[];
  noSuggestions: boolean;
  globalRepository: string;
}

export const PolicyIdComboBoxField = ({
  field,
  isLoading,
  repos,
  noSuggestions,
}: PropsRepositoryCombobox) => {
  const { data: agentPolicies = [] } = useAgentPolicies();

  const agentPoliciesById = mapKeys(agentPolicies, 'id');

  const { setValue, value } = field;

  const agentPolicyOptions = useMemo(
    () =>
      agentPolicies.map((agentPolicy) => ({
        key: agentPolicy.id,
        label: agentPolicy.id,
      })),
    [agentPolicies]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => (
      <EuiFlexGroup>
        <AgentPolicyNameColumn grow={2}>
          <span className="eui-textTruncate">
            {agentPoliciesById[option.key!]?.name ?? option.label}
          </span>
        </AgentPolicyNameColumn>
        <AgentPolicyDescriptionColumn grow={5}>
          <EuiTextColor className="eui-textTruncate" color="subdued">
            {agentPoliciesById[option.key!].description}
          </EuiTextColor>
        </AgentPolicyDescriptionColumn>
        <EuiFlexItem grow={2} className="eui-textRight">
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyAgentsCountText"
              defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                count: agentPoliciesById[option.key!]?.agents ?? 0,
              }}
            />
          </EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [agentPoliciesById]
  );

  return (
    <ComboBoxField
      field={field as FieldHook}
      fullWidth={true}
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      euiFieldProps={{
        singleSelection: { asPlainText: true },
        noSuggestions: false,
        isClearable: false,
        options: agentPolicyOptions,
        'data-test-subj': 'searchableSnapshotCombobox',
        selectedOptions: value.map((policyId) => ({
          label: agentPoliciesById[policyId]?.name ?? policyId,
        })),
        renderOption,
      }}
    />
  );
};
