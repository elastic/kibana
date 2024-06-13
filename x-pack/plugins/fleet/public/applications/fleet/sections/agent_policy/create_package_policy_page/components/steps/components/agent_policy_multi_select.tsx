/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import React, { useMemo } from 'react';

import type { PackageInfo } from '../../../../../../../../../common';

export interface Props {
  isLoading: boolean;
  agentPolicyMultiOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedPolicyIds: string[];
  setSelectedPolicyIds: (policyIds: string[]) => void;
  packageInfo?: PackageInfo;
}

export const AgentPolicyMultiSelect: React.FunctionComponent<Props> = ({
  isLoading,
  agentPolicyMultiOptions,
  selectedPolicyIds,
  setSelectedPolicyIds,
}) => {
  const selectedOptions = useMemo(() => {
    return agentPolicyMultiOptions.filter((option) => selectedPolicyIds.includes(option.key!));
  }, [agentPolicyMultiOptions, selectedPolicyIds]);

  return (
    <EuiComboBox
      aria-label="Select Multiple Agent Policies"
      data-test-subj="agentPolicyMultiSelect"
      placeholder={i18n.translate(
        'xpack.fleet.createPackagePolicy.StepSelectPolicy.agentPolicyMultiPlaceholderText',
        {
          defaultMessage: 'Select agent policies to add this integration to',
        }
      )}
      options={agentPolicyMultiOptions}
      selectedOptions={selectedOptions}
      onChange={(newOptions) => {
        setSelectedPolicyIds(newOptions.map((option: any) => option.key));
      }}
      isClearable={true}
      isLoading={isLoading}
    />
  );
};
