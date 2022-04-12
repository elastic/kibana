/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';

import { SelectCreateAgentPolicy } from '../../../components';

import type { GetAgentPoliciesResponseItem } from '../../../types';

export const getSelectAgentPolicyStep = ({
  policyId,
  setPolicyId,
  eligibleFleetServerPolicies,
  refreshEligibleFleetServerPolicies,
}: {
  policyId?: string;
  setPolicyId: (v?: string) => void;
  eligibleFleetServerPolicies: GetAgentPoliciesResponseItem[];
  refreshEligibleFleetServerPolicies: () => void;
}): EuiStepProps => {
  return {
    title:
      eligibleFleetServerPolicies.length === 0
        ? i18n.translate('xpack.fleet.fleetServerSetup.stepCreateAgentPolicyTitle', {
            defaultMessage: 'Create a policy for Fleet Server',
          })
        : i18n.translate('xpack.fleet.fleetServerSetup.stepSelectAgentPolicyTitle', {
            defaultMessage: 'Select a policy for Fleet Server',
          }),
    status: policyId ? 'complete' : undefined,
    children: (
      <SelectAgentPolicyStepContent
        policyId={policyId}
        setPolicyId={setPolicyId}
        eligibleFleetServerPolicies={eligibleFleetServerPolicies}
        refreshEligibleFleetServerPolicies={refreshEligibleFleetServerPolicies}
      />
    ),
  };
};

const SelectAgentPolicyStepContent: React.FunctionComponent<{
  policyId?: string;
  setPolicyId: (v?: string) => void;
  eligibleFleetServerPolicies: GetAgentPoliciesResponseItem[];
  refreshEligibleFleetServerPolicies: () => void;
}> = ({
  policyId,
  setPolicyId,
  eligibleFleetServerPolicies,
  refreshEligibleFleetServerPolicies,
}) => {
  useEffect(() => {
    // Select default value
    if (eligibleFleetServerPolicies.length && !policyId) {
      setPolicyId(eligibleFleetServerPolicies[0].id);
    }
  }, [eligibleFleetServerPolicies, policyId, setPolicyId]);

  const setSelectedPolicyId = (agentPolicyId?: string) => {
    setPolicyId(agentPolicyId);
  };

  return (
    <SelectCreateAgentPolicy
      agentPolicies={eligibleFleetServerPolicies}
      withKeySelection={false}
      selectedPolicyId={policyId}
      setSelectedPolicyId={setSelectedPolicyId}
      refreshAgentPolicies={refreshEligibleFleetServerPolicies}
      excludeFleetServer={false}
      isFleetServerPolicy={true}
    />
  );
};
