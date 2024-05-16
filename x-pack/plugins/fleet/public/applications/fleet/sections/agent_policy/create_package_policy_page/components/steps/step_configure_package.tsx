/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  getNormalizedInputs,
  isIntegrationPolicyTemplate,
  getRegistryStreamWithDataStreamForInputType,
} from '../../../../../../../../common/services';

import type {
  PackageInfo,
  NewPackagePolicy,
  NewPackagePolicyInput,
  RegistryPolicyTemplate,
} from '../../../../../types';
import { Loading } from '../../../../../components';
import { doesPackageHaveIntegrations } from '../../../../../services';

import type { PackagePolicyValidationResults } from '../../services';
import { useAgentlessPolicy } from '../../single_page_layout/hooks/setup_technology';

import { PackagePolicyInputPanel } from './components';

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  packageInfo: PackageInfo;
  showOnlyIntegration?: string;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults | undefined;
  submitAttempted: boolean;
  noTopRule?: boolean;
  isEditPage?: boolean;
}> = ({
  packageInfo,
  showOnlyIntegration,
  packagePolicy,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
  noTopRule = false,
  isEditPage = false,
}) => {
  const { isAgentlessEnabled } = useAgentlessPolicy();
  const hasIntegrations = useMemo(() => doesPackageHaveIntegrations(packageInfo), [packageInfo]);
  const packagePolicyTemplates = useMemo(
    () =>
      showOnlyIntegration
        ? (packageInfo.policy_templates || []).filter(
            (policyTemplate) => policyTemplate.name === showOnlyIntegration
          )
        : packageInfo.policy_templates || [],
    [packageInfo.policy_templates, showOnlyIntegration]
  );

  const filterByDeploymentModes = useCallback(
    (policyTemplate: RegistryPolicyTemplate) => {
      if (!policyTemplate.deployment_modes) return true;
      return (
        (isAgentlessEnabled && policyTemplate.deployment_modes?.agentless.enabled === true) ||
        (!isAgentlessEnabled && policyTemplate?.deployment_modes?.default?.enabled === true)
      );
    },
    [isAgentlessEnabled]
  );

  // Exclude the policy templates not enabled for the current environment
  const filteredPackagePolicyTemplates = useMemo(() => {
    return packagePolicyTemplates.filter(
      (policyTemplate) => filterByDeploymentModes(policyTemplate) === true
    );
  }, [packagePolicyTemplates, filterByDeploymentModes]);

  // Configure inputs (and their streams)
  const renderConfigureInputs = () =>
    filteredPackagePolicyTemplates.length ? (
      <>
        {!noTopRule && <EuiHorizontalRule margin="m" />}
        <EuiFlexGroup direction="column" gutterSize="none">
          {filteredPackagePolicyTemplates.map((policyTemplate) => {
            const inputs = getNormalizedInputs(policyTemplate);
            return inputs.map((packageInput) => {
              const packagePolicyInput = packagePolicy.inputs.find(
                (input) =>
                  input.type === packageInput.type &&
                  (hasIntegrations ? input.policy_template === policyTemplate.name : true)
              );
              const packageInputStreams = getRegistryStreamWithDataStreamForInputType(
                packageInput.type,
                packageInfo,
                hasIntegrations && isIntegrationPolicyTemplate(policyTemplate)
                  ? policyTemplate.data_streams
                  : []
              );
              return packagePolicyInput ? (
                <EuiFlexItem key={packageInput.type}>
                  <PackagePolicyInputPanel
                    packageInput={packageInput}
                    packageInfo={packageInfo}
                    packageInputStreams={packageInputStreams}
                    packagePolicyInput={packagePolicyInput}
                    updatePackagePolicyInput={(updatedInput: Partial<NewPackagePolicyInput>) => {
                      const indexOfUpdatedInput = packagePolicy.inputs.findIndex(
                        (input) =>
                          input.type === packageInput.type &&
                          (hasIntegrations ? input.policy_template === policyTemplate.name : true)
                      );
                      const newInputs = [...packagePolicy.inputs];
                      newInputs[indexOfUpdatedInput] = {
                        ...newInputs[indexOfUpdatedInput],
                        ...updatedInput,
                      };
                      updatePackagePolicy({
                        inputs: newInputs,
                      });
                    }}
                    inputValidationResults={
                      validationResults?.inputs?.[
                        hasIntegrations
                          ? `${policyTemplate.name}-${packagePolicyInput.type}`
                          : packagePolicyInput.type
                      ] ?? {}
                    }
                    forceShowErrors={submitAttempted}
                    isEditPage={isEditPage}
                  />
                  <EuiHorizontalRule margin="m" />
                </EuiFlexItem>
              ) : null;
            });
          })}
        </EuiFlexGroup>
      </>
    ) : (
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="success"
        body={
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.noPolicyOptionsMessage"
                defaultMessage="Nothing to configure"
              />
            </p>
          </EuiText>
        }
      />
    );

  return validationResults ? renderConfigureInputs() : <Loading />;
};
