/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiComboBoxOptionOption } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { GetAgentPoliciesResponseItem } from '../../../../fleet/common';
import { ComboBoxField, FieldHook } from '../../shared_imports';

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

type ComboBoxFieldProps = Parameters<typeof ComboBoxField>[0];

type PolicyIdComboBoxFieldProps = Pick<ComboBoxFieldProps, 'euiFieldProps'> & {
  field: FieldHook<string[]>;
  agentPoliciesById: Record<string, GetAgentPoliciesResponseItem>;
};

const PolicyIdComboBoxFieldComponent: React.FC<PolicyIdComboBoxFieldProps> = ({
  euiFieldProps,
  field,
  agentPoliciesById,
}) => {
  const { value } = field;

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => (
      <EuiFlexGroup>
        <AgentPolicyNameColumn grow={2}>
          <span className="eui-textTruncate">
            {(option.key && agentPoliciesById[option.key]?.name) ?? option.label}
          </span>
        </AgentPolicyNameColumn>
        <AgentPolicyDescriptionColumn grow={5}>
          <EuiTextColor className="eui-textTruncate" color="subdued">
            {(option.key && agentPoliciesById[option.key].description) ?? ''}
          </EuiTextColor>
        </AgentPolicyDescriptionColumn>
        <EuiFlexItem grow={2} className="eui-textRight">
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.osquery.createScheduledQuery.agentPolicyAgentsCountText"
              defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                count: (option.key && agentPoliciesById[option.key]?.agents) ?? 0,
              }}
            />
          </EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [agentPoliciesById]
  );

  const selectedOptions = useMemo(() => {
    if (!value?.length || !value[0].length) return [];

    return value.map((policyId) => ({
      label: agentPoliciesById[policyId]?.name ?? policyId,
    }));
  }, [agentPoliciesById, value]);

  const helpText = useMemo(() => {
    if (!value?.length || !value[0].length || !agentPoliciesById || !agentPoliciesById[value[0]])
      return;

    return (
      <FormattedMessage
        id="xpack.osquery.createScheduledQuery.agentPolicyAgentsCountText"
        defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          count: agentPoliciesById[value[0]].agents ?? 0,
        }}
      />
    );
  }, [agentPoliciesById, value]);

  const mergedEuiFieldProps = useMemo(
    () => ({
      onCreateOption: null,
      singleSelection: { asPlainText: true },
      noSuggestions: false,
      isClearable: false,
      selectedOptions,
      renderOption,
      ...euiFieldProps,
    }),
    [euiFieldProps, renderOption, selectedOptions]
  );

  return (
    <ComboBoxField
      field={field as FieldHook}
      fullWidth={true}
      helpText={helpText}
      euiFieldProps={mergedEuiFieldProps}
    />
  );
};

export const PolicyIdComboBoxField = React.memo(PolicyIdComboBoxFieldComponent);
