/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFilterButton, EuiFilterSelectItem, EuiPopover, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy } from '../../../../../../../../common';

export interface Props {
  selectedAgentPolicies: string[];
  onSelectedAgentPoliciesChange: (selectedPolicies: string[]) => void;
  agentPolicies: AgentPolicy[];
}

export const AgentPolicyFilter: React.FunctionComponent<Props> = ({
  selectedAgentPolicies,
  onSelectedAgentPoliciesChange,
  agentPolicies,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  // Policies state for filtering
  const [isAgentPoliciesFilterOpen, setIsAgentPoliciesFilterOpen] = useState<boolean>(false);

  // Add a agent policy id to current search
  const addAgentPolicyFilter = (policyId: string) => {
    onSelectedAgentPoliciesChange([...selectedAgentPolicies, policyId]);
  };

  // Remove a agent policy id from current search
  const removeAgentPolicyFilter = (policyId: string) => {
    onSelectedAgentPoliciesChange(
      selectedAgentPolicies.filter((agentPolicy) => agentPolicy !== policyId)
    );
  };

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsAgentPoliciesFilterOpen(!isAgentPoliciesFilterOpen)}
          isSelected={isAgentPoliciesFilterOpen}
          hasActiveFilters={selectedAgentPolicies.length > 0}
          numActiveFilters={selectedAgentPolicies.length}
          numFilters={agentPolicies.length}
          disabled={agentPolicies.length === 0}
          data-test-subj="agentList.policyFilter"
        >
          <FormattedMessage
            id="xpack.fleet.agentList.policyFilterText"
            defaultMessage="Agent policy"
          />
        </EuiFilterButton>
      }
      isOpen={isAgentPoliciesFilterOpen}
      closePopover={() => setIsAgentPoliciesFilterOpen(false)}
      panelPaddingSize="none"
    >
      {/*  EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
            instead of EuiFilterSelectItem (which is pending deprecation).
            @see https://elastic.github.io/eui/#/forms/filter-group#multi-select */}
      <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
        {agentPolicies.map((agentPolicy, index) => (
          <EuiFilterSelectItem
            checked={selectedAgentPolicies.includes(agentPolicy.id) ? 'on' : undefined}
            key={index}
            onClick={() => {
              if (selectedAgentPolicies.includes(agentPolicy.id)) {
                removeAgentPolicyFilter(agentPolicy.id);
              } else {
                addAgentPolicyFilter(agentPolicy.id);
              }
            }}
          >
            {agentPolicy.name}
          </EuiFilterSelectItem>
        ))}
      </div>
      {/* <EuiSelectable
        options={options}
        onChange={(newOptions) => {
          setOptions(newOptions);
          newOptions.forEach((option, index) => {
            if (option.checked !== options[index].checked) {
              onToggleLevel(option.label);
              return;
            }
          });
        }}
        data-test-subj="agentList.logLevelFilterOptions"
        listProps={{
          paddingSize: 's',
        }}
      >
        {(list) => list}
      </EuiSelectable> */}
    </EuiPopover>
  );
};
