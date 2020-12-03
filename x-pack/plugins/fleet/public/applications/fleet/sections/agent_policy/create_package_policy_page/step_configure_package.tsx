/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  PackageInfo,
  RegistryStream,
  NewPackagePolicy,
  NewPackagePolicyInput,
} from '../../../types';
import { Loading } from '../../../components';
import { PackagePolicyValidationResults } from './services';
import { PackagePolicyInputPanel } from './components';
import { CreatePackagePolicyFrom } from './types';

const findStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo
): Array<RegistryStream & { data_stream: { dataset: string } }> => {
  const streams: Array<RegistryStream & { data_stream: { dataset: string } }> = [];

  (packageInfo.data_streams || []).forEach((dataStream) => {
    (dataStream.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          data_stream: {
            dataset: dataStream.dataset,
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
    packageInfo.policy_templates &&
    packageInfo.policy_templates[0] &&
    packageInfo.policy_templates[0].inputs &&
    packageInfo.policy_templates[0].inputs.length ? (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {packageInfo.policy_templates[0].inputs.map((packageInput) => {
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
                  updatePackagePolicyInput={(updatedInput: Partial<NewPackagePolicyInput>) => {
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
      <EuiEmptyPrompt
        iconType="checkInCircleFilled"
        iconColor="secondary"
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
