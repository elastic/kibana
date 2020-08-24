/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PackageInfo, RegistryStream, NewPackagePolicy, PackagePolicyInput } from '../../../types';
import { Loading } from '../../../components';
import { PackagePolicyValidationResults } from './services';
import { PackagePolicyInputPanel, CustomPackagePolicy } from './components';
import { CreatePackagePolicyFrom } from './types';

const findStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo
): Array<RegistryStream & { data_stream: { dataset: string } }> => {
  const streams: Array<RegistryStream & { data_stream: { dataset: string } }> = [];

  (packageInfo.datasets || []).forEach((dataset) => {
    (dataset.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          data_stream: {
            dataset: dataset.name,
          },
        });
      }
    });
  });

  return streams;
};

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  from?: CreatePackagePolicyFrom;
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  packagePolicyId?: string;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults;
  submitAttempted: boolean;
}> = ({
  from = 'policy',
  packageInfo,
  packagePolicy,
  packagePolicyId,
  updatePackagePolicy,
  validationResults,
  submitAttempted,
}) => {
  // Configure inputs (and their streams)
  // Assume packages only export one config template for now
  const renderConfigureInputs = () =>
    packageInfo.config_templates &&
    packageInfo.config_templates[0] &&
    packageInfo.config_templates[0].inputs &&
    packageInfo.config_templates[0].inputs.length ? (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {packageInfo.config_templates[0].inputs.map((packageInput) => {
            const packagePolicyInput = packagePolicy.inputs.find(
              (input) => input.type === packageInput.type
            );
            const packageInputStreams = findStreamsForInputType(packageInput.type, packageInfo);
            return packagePolicyInput ? (
              <EuiFlexItem key={packageInput.type}>
                <PackagePolicyInputPanel
                  packageInput={packageInput}
                  packageInputStreams={packageInputStreams}
                  packagePolicyInput={packagePolicyInput}
                  updatePackagePolicyInput={(updatedInput: Partial<PackagePolicyInput>) => {
                    const indexOfUpdatedInput = packagePolicy.inputs.findIndex(
                      (input) => input.type === packageInput.type
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
                  inputValidationResults={validationResults!.inputs![packagePolicyInput.type]}
                  forceShowErrors={submitAttempted}
                />
                <EuiHorizontalRule margin="m" />
              </EuiFlexItem>
            ) : null;
          })}
        </EuiFlexGroup>
      </>
    ) : (
      <CustomPackagePolicy
        from={from}
        packageName={packageInfo.name}
        packagePolicy={packagePolicy}
        packagePolicyId={packagePolicyId}
      />
    );

  return validationResults ? renderConfigureInputs() : <Loading />;
};
