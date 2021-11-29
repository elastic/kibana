/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo, NewPackagePolicy, NewPackagePolicyInput } from '../../../types';
import { Loading } from '../../../components';
import { getStreamsForInputType, doesPackageHaveIntegrations } from '../../../services';

import type { PackagePolicyValidationResults } from './services';
import { PackagePolicyInputPanel } from './components';

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  packageInfo: PackageInfo;
  showOnlyIntegration?: string;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults;
  submitAttempted: boolean;
}> = ({
  packageInfo,
  showOnlyIntegration,
  packagePolicy,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
}) => {
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

  // Configure inputs (and their streams)
  const renderConfigureInputs = () =>
    packagePolicyTemplates.length ? (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {packagePolicyTemplates.map((policyTemplate) => {
            return (policyTemplate.inputs || []).map((packageInput) => {
              const packagePolicyInput = packagePolicy.inputs.find(
                (input) =>
                  input.type === packageInput.type &&
                  (hasIntegrations ? input.policy_template === policyTemplate.name : true)
              );
              const packageInputStreams = getStreamsForInputType(
                packageInput.type,
                packageInfo,
                hasIntegrations ? policyTemplate.data_streams : []
              );
              return packagePolicyInput ? (
                <EuiFlexItem key={packageInput.type}>
                  <PackagePolicyInputPanel
                    packageInput={packageInput}
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
                      validationResults!.inputs![
                        hasIntegrations
                          ? `${policyTemplate.name}-${packagePolicyInput.type}`
                          : packagePolicyInput.type
                      ]
                    }
                    forceShowErrors={submitAttempted}
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
