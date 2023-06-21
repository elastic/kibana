/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, reduce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiComboBoxProps, EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
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

interface PolicyIdComboBoxFieldProps {
  euiFieldProps?: EuiComboBoxProps<string>;
  options: Array<EuiComboBoxOptionOption<string>>;
}

const PolicyIdComboBoxFieldComponent: React.FC<PolicyIdComboBoxFieldProps> = ({
  euiFieldProps,
  options,
}) => {
  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController<{ policy_ids: string[] }>({
    name: 'policy_ids',
    defaultValue: [],
    rules: {},
  });

  const selectedOptions = useMemo(() => {
    if (agentPoliciesById) {
      return castArray(value).map((policyId) => ({
        key: policyId,
        label: agentPoliciesById[policyId]?.name ?? policyId,
      }));
    }

    return [];
  }, [agentPoliciesById, value]);

  const handleChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      onChange(newOptions.map((option) => option.key || option.label));
    },
    [onChange]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => (
      <EuiFlexGroup>
        <AgentPolicyNameColumn grow={2}>
          <span className="eui-textTruncate">
            {(option.key && agentPoliciesById?.[option.key]?.name) ?? option.label}
          </span>
        </AgentPolicyNameColumn>
        <AgentPolicyDescriptionColumn grow={5}>
          <EuiTextColor className="eui-textTruncate" color="subdued">
            {(option.key && agentPoliciesById?.[option.key].description) ?? ''}
          </EuiTextColor>
        </AgentPolicyDescriptionColumn>
        <EuiFlexItem grow={2} className="eui-textRight">
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.osquery.createScheduledQuery.agentPolicyAgentsCountText"
              defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                count: (option.key && agentPoliciesById?.[option.key]?.agents) ?? 0,
              }}
            />
          </EuiTextColor>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [agentPoliciesById]
  );

  const helpText = useMemo(() => {
    if (!value?.length || !value[0].length || !agentPoliciesById) {
      return (
        <FormattedMessage
          id="xpack.osquery.pack.form.agentPoliciesFieldHelpText"
          defaultMessage="Queries in this pack are scheduled for agents in the selected policies."
        />
      );
    }

    const agentCount = reduce(
      value,
      (acc, policyId) => {
        const agentPolicy = agentPoliciesById && agentPoliciesById[policyId];

        return acc + (agentPolicy?.agents ?? 0);
      },
      0
    );

    return (
      <FormattedMessage
        id="xpack.osquery.createScheduledQuery.agentPolicyAgentsCountText"
        defaultMessage="{count, plural, one {# agent} other {# agents}} enrolled"
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        values={{
          count: agentCount,
        }}
      />
    );
  }, [agentPoliciesById, value]);

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.pack.form.agentPoliciesFieldLabel', {
        defaultMessage: 'Scheduled agent policies (optional)',
      })}
      helpText={helpText}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiComboBox
        isInvalid={hasError}
        selectedOptions={selectedOptions}
        fullWidth
        data-test-subj="policyIdsComboBox"
        isClearable
        options={options}
        renderOption={renderOption}
        onChange={handleChange}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const PolicyIdComboBoxField = React.memo(PolicyIdComboBoxFieldComponent, deepEqual);
