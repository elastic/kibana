/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment, memo, useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { PackagePolicyInput, RegistryVarsEntry } from '../../../../types';
import {
  isAdvancedVar,
  PackagePolicyConfigValidationResults,
  validationHasErrors,
} from '../services';
import { PackagePolicyInputVarField } from './package_policy_input_var_field';

const FlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: calc(50% - ${(props) => props.theme.eui.euiSizeL});
`;

export const PackagePolicyInputConfig: React.FunctionComponent<{
  packageInputVars?: RegistryVarsEntry[];
  packagePolicyInput: PackagePolicyInput;
  updatePackagePolicyInput: (updatedInput: Partial<PackagePolicyInput>) => void;
  inputVarsValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packageInputVars,
    packagePolicyInput,
    updatePackagePolicyInput,
    inputVarsValidationResults,
    forceShowErrors,
  }) => {
    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputVarsValidationResults);

    const requiredVars: RegistryVarsEntry[] = [];
    const advancedVars: RegistryVarsEntry[] = [];

    if (packageInputVars) {
      packageInputVars.forEach((varDef) => {
        if (isAdvancedVar(varDef)) {
          advancedVars.push(varDef);
        } else {
          requiredVars.push(varDef);
        }
      });
    }

    const advancedVarsWithErrorsCount: number = useMemo(
      () =>
        advancedVars.filter(
          ({ name: varName }) => inputVarsValidationResults.vars?.[varName]?.length
        ).length,
      [advancedVars, inputVarsValidationResults.vars]
    );

    return (
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="flexStart">
            <EuiFlexItem grow={1} />
            <EuiFlexItem grow={5}>
              <EuiText>
                <h4>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackagePolicy.stepConfigure.inputSettingsTitle"
                    defaultMessage="Settings"
                  />
                </h4>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackagePolicy.stepConfigure.inputSettingsDescription"
                    defaultMessage="The following settings are applicable to all inputs below."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <FlexItemWithMaxWidth>
          <EuiFlexGroup direction="column" gutterSize="m">
            {requiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;
              const value = packagePolicyInput.vars![varName].value;
              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    onChange={(newValue: any) => {
                      updatePackagePolicyInput({
                        vars: {
                          ...packagePolicyInput.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={inputVarsValidationResults.vars![varName]}
                    forceShowErrors={forceShowErrors}
                  />
                </EuiFlexItem>
              );
            })}
            {advancedVars.length ? (
              <Fragment>
                <EuiFlexItem>
                  {/* Wrapper div to prevent button from going full width */}
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                        onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                        flush="left"
                      >
                        <FormattedMessage
                          id="xpack.ingestManager.createPackagePolicy.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.ingestManager.createPackagePolicy.stepConfigure.errorCountText"
                            defaultMessage="{count, plural, one {# error} other {# errors}}"
                            values={{ count: advancedVarsWithErrorsCount }}
                          />
                        </EuiText>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
                {isShowingAdvanced
                  ? advancedVars.map((varDef) => {
                      const { name: varName, type: varType } = varDef;
                      const value = packagePolicyInput.vars![varName].value;
                      return (
                        <EuiFlexItem key={varName}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackagePolicyInput({
                                vars: {
                                  ...packagePolicyInput.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={inputVarsValidationResults.vars![varName]}
                            forceShowErrors={forceShowErrors}
                          />
                        </EuiFlexItem>
                      );
                    })
                  : null}
              </Fragment>
            ) : null}
          </EuiFlexGroup>
        </FlexItemWithMaxWidth>
      </EuiFlexGrid>
    );
  }
);
