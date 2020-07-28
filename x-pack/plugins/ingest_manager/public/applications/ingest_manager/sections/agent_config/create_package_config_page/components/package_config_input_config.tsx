/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment, memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { PackageConfigInput, RegistryVarsEntry } from '../../../../types';
import {
  isAdvancedVar,
  PackageConfigConfigValidationResults,
  validationHasErrors,
} from '../services';
import { PackageConfigInputVarField } from './package_config_input_var_field';

export const PackageConfigInputConfig: React.FunctionComponent<{
  packageInputVars?: RegistryVarsEntry[];
  packageConfigInput: PackageConfigInput;
  updatePackageConfigInput: (updatedInput: Partial<PackageConfigInput>) => void;
  inputVarsValidationResults: PackageConfigConfigValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packageInputVars,
    packageConfigInput,
    updatePackageConfigInput,
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
                    id="xpack.ingestManager.createPackageConfig.stepConfigure.inputSettingsTitle"
                    defaultMessage="Settings"
                  />
                </h4>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.stepConfigure.inputSettingsDescription"
                    defaultMessage="The following settings are applicable to all inputs below."
                  />
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            {requiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;
              const value = packageConfigInput.vars![varName].value;
              return (
                <EuiFlexItem key={varName}>
                  <PackageConfigInputVarField
                    varDef={varDef}
                    value={value}
                    onChange={(newValue: any) => {
                      updatePackageConfigInput({
                        vars: {
                          ...packageConfigInput.vars,
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
                          id="xpack.ingestManager.createPackageConfig.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.ingestManager.createPackageConfig.stepConfigure.errorCountText"
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
                      const value = packageConfigInput.vars![varName].value;
                      return (
                        <EuiFlexItem key={varName}>
                          <PackageConfigInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackageConfigInput({
                                vars: {
                                  ...packageConfigInput.vars,
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
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  }
);
