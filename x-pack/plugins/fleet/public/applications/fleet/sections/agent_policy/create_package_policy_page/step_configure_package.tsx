/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, memo } from 'react';
import { keyBy } from 'lodash';
import {
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiEmptyPrompt,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import type { PackageInfo, NewPackagePolicy, NewPackagePolicyInput } from '../../../types';
import { Loading } from '../../../components';
import { groupInputs } from '../../../services';

import type { PackagePolicyValidationResults } from './services';
import { PackagePolicyInputPanel } from './components';

export const StepConfigurePackagePolicy: React.FunctionComponent<{
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults;
  submitAttempted: boolean;
}> = memo(
  ({ packageInfo, packagePolicy, updatePackagePolicy, validationResults, submitAttempted }) => {
    const groupedPackageInputs = useMemo(() => groupInputs(packageInfo), [packageInfo]);
    const policyInputsByType = useMemo(() => keyBy(packagePolicy.inputs, 'type'), [
      packagePolicy.inputs,
    ]);

    if (groupedPackageInputs.length === 0) {
      return (
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
    }

    return validationResults ? (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {groupedPackageInputs.map((packageInput) => {
            const inputType = packageInput.name;
            const packagePolicyInput = policyInputsByType[inputType];
            return packagePolicyInput ? (
              <EuiFlexItem key={packageInput.name}>
                <PackagePolicyInputPanel
                  packageInput={{ type: inputType, ...packageInput }}
                  packageInputStreams={packageInput.streams || []}
                  packagePolicyInput={packagePolicyInput}
                  updatePackagePolicyInput={(updatedInput: Partial<NewPackagePolicyInput>) => {
                    const indexOfUpdatedInput = packagePolicy.inputs.findIndex(
                      (input) => input.type === packageInput.name
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
      <Loading />
    );
  }
);
