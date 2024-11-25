/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiTitle } from '@elastic/eui';

import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../../types';
import { AgentPolicyIntegrationForm } from '../../components';
import type { ValidationResults } from '../../components/agent_policy_validation';

import { incrementPolicyName } from '../../../../services';

import { StepSelectAgentPolicy } from '../../create_package_policy_page/components/steps/step_select_agent_policy';
import { SelectedPolicyTab } from '../../create_package_policy_page/components';
import { useAllNonManagedAgentPolicies } from '../../create_package_policy_page/components/steps/components/use_policies';

interface Props {
  agentPolicies: AgentPolicy[];
  updateAgentPolicies: (u: AgentPolicy[]) => void;
  newAgentPolicy: Partial<NewAgentPolicy>;
  updateNewAgentPolicy: (u: Partial<NewAgentPolicy>) => void;
  withSysMonitoring: boolean;
  updateSysMonitoring: (newValue: boolean) => void;
  validation: ValidationResults;
  packageInfo?: PackageInfo;
  setHasAgentPolicyError: (hasError: boolean) => void;
  selectedAgentPolicyIds: string[];
  updateSelectedTab: (tab: SelectedPolicyTab) => void;
}

export const StepEditHosts: React.FunctionComponent<Props> = ({
  agentPolicies,
  updateAgentPolicies,
  newAgentPolicy,
  updateNewAgentPolicy,
  withSysMonitoring,
  updateSysMonitoring,
  validation,
  packageInfo,
  setHasAgentPolicyError,
  selectedAgentPolicyIds,
  updateSelectedTab,
}) => {
  const [showCreateAgentPolicy, setShowCreateAgentPolicy] = useState<boolean>(false);
  const existingAgentPolicies: AgentPolicy[] = useAllNonManagedAgentPolicies();

  useEffect(() => {
    if (existingAgentPolicies && existingAgentPolicies.length > 0) {
      updateNewAgentPolicy({
        ...newAgentPolicy,
        name: incrementPolicyName(existingAgentPolicies),
      });
    }
  }, [existingAgentPolicies, newAgentPolicy, updateNewAgentPolicy]);

  return (
    <EuiFlexGroup direction="column" alignItems="flexStart">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.stepEditAgentPoliciesTitle"
              defaultMessage="For existing hosts:"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <StepSelectAgentPolicy
          packageInfo={packageInfo}
          agentPolicies={agentPolicies}
          updateAgentPolicies={updateAgentPolicies}
          setHasAgentPolicyError={setHasAgentPolicyError}
          initialSelectedAgentPolicyIds={selectedAgentPolicyIds}
        />
      </EuiFlexItem>

      <EuiHorizontalRule margin="s" />

      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.stepAddAgentPolicyTitle"
              defaultMessage="For a new host:"
            />
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      {!showCreateAgentPolicy && (
        <EuiFlexItem>
          <EuiButton
            iconType="plusInCircle"
            onClick={() => {
              setShowCreateAgentPolicy(true);
              updateSelectedTab(SelectedPolicyTab.NEW);
            }}
            data-test-subj="createNewAgentPolicyButton"
          >
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.addNewAgentPolicyButtonText"
              defaultMessage="Create a new agent policy"
            />
          </EuiButton>
        </EuiFlexItem>
      )}
      {showCreateAgentPolicy && (
        <>
          <EuiFlexItem>
            <AgentPolicyIntegrationForm
              agentPolicy={newAgentPolicy}
              updateAgentPolicy={updateNewAgentPolicy}
              withSysMonitoring={withSysMonitoring}
              updateSysMonitoring={updateSysMonitoring}
              validation={validation}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              iconType="trash"
              color="text"
              onClick={() => {
                setShowCreateAgentPolicy(false);
                updateSelectedTab(SelectedPolicyTab.EXISTING);
              }}
              data-test-subj="deleteNewAgentPolicyButton"
            >
              <FormattedMessage
                id="xpack.fleet.editPackagePolicy.removeNewAgentPolicyButtonText"
                defaultMessage="Remove"
              />
            </EuiButton>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
