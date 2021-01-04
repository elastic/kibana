/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentPolicy } from '../../../../types';
import { SearchBar } from '../../../../components';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../../constants';

const statusFilters = [
  {
    status: 'healthy',
    label: i18n.translate('xpack.fleet.agentList.statusHealthyFilterText', {
      defaultMessage: 'Healthy',
    }),
  },
  {
    status: 'unhealthy',
    label: i18n.translate('xpack.fleet.agentList.statusUnhealthyFilterText', {
      defaultMessage: 'Unhealthy',
    }),
  },
  {
    status: 'updating',
    label: i18n.translate('xpack.fleet.agentList.statusUpdatingFilterText', {
      defaultMessage: 'Updating',
    }),
  },
  {
    status: 'offline',
    label: i18n.translate('xpack.fleet.agentList.statusOfflineFilterText', {
      defaultMessage: 'Offline',
    }),
  },
  {
    status: 'inactive',
    label: i18n.translate('xpack.fleet.agentList.statusInactiveFilterText', {
      defaultMessage: 'Inactive',
    }),
  },
];

export const SearchAndFilterBar: React.FunctionComponent<{
  agentPolicies: AgentPolicy[];
  draftKuery: string;
  onDraftKueryChange: (kuery: string) => void;
  onSubmitSearch: (kuery: string) => void;
  selectedAgentPolicies: string[];
  onSelectedAgentPoliciesChange: (selectedPolicies: string[]) => void;
  selectedStatus: string[];
  onSelectedStatusChange: (selectedStatus: string[]) => void;
  showUpgradeable: boolean;
  onShowUpgradeableChange: (showUpgradeable: boolean) => void;
}> = ({
  agentPolicies,
  draftKuery,
  onDraftKueryChange,
  onSubmitSearch,
  selectedAgentPolicies,
  onSelectedAgentPoliciesChange,
  selectedStatus,
  onSelectedStatusChange,
  showUpgradeable,
  onShowUpgradeableChange,
}) => {
  // Policies state for filtering
  const [isAgentPoliciesFilterOpen, setIsAgentPoliciesFilterOpen] = useState<boolean>(false);

  // Status for filtering
  const [isStatusFilterOpen, setIsStatutsFilterOpen] = useState<boolean>(false);

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
    <>
      {/* Search and filter bar */}
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={4}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={6}>
              <SearchBar
                value={draftKuery}
                onChange={(newSearch, submit) => {
                  onDraftKueryChange(newSearch);
                  if (submit) {
                    onSubmitSearch(newSearch);
                  }
                }}
                fieldPrefix={AGENT_SAVED_OBJECT_TYPE}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <EuiFilterGroup>
                <EuiPopover
                  ownFocus
                  button={
                    <EuiFilterButton
                      iconType="arrowDown"
                      onClick={() => setIsStatutsFilterOpen(!isStatusFilterOpen)}
                      isSelected={isStatusFilterOpen}
                      hasActiveFilters={selectedStatus.length > 0}
                      numActiveFilters={selectedStatus.length}
                      disabled={agentPolicies.length === 0}
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentList.statusFilterText"
                        defaultMessage="Status"
                      />
                    </EuiFilterButton>
                  }
                  isOpen={isStatusFilterOpen}
                  closePopover={() => setIsStatutsFilterOpen(false)}
                  panelPaddingSize="none"
                >
                  <div className="euiFilterSelect__items">
                    {statusFilters.map(({ label, status }, idx) => (
                      <EuiFilterSelectItem
                        key={idx}
                        checked={selectedStatus.includes(status) ? 'on' : undefined}
                        onClick={() => {
                          if (selectedStatus.includes(status)) {
                            onSelectedStatusChange([...selectedStatus.filter((s) => s !== status)]);
                          } else {
                            onSelectedStatusChange([...selectedStatus, status]);
                          }
                        }}
                      >
                        {label}
                      </EuiFilterSelectItem>
                    ))}
                  </div>
                </EuiPopover>
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
                  <div className="euiFilterSelect__items">
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
                </EuiPopover>
                <EuiFilterButton
                  hasActiveFilters={showUpgradeable}
                  onClick={() => {
                    onShowUpgradeableChange(!showUpgradeable);
                  }}
                >
                  <FormattedMessage
                    id="xpack.fleet.agentList.showUpgradeableFilterLabel"
                    defaultMessage="Upgrade available"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
