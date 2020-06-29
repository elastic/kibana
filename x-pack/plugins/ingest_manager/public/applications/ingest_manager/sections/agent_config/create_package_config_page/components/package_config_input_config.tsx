/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiSpacer,
  EuiButtonEmpty,
  EuiTitle,
  EuiIconTip,
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
}> = ({
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

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1}>
        <EuiTitle size="s">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <h4>
                <EuiTextColor color={hasErrors ? 'danger' : 'default'}>
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.stepConfigure.inputSettingsTitle"
                    defaultMessage="Settings"
                  />
                </EuiTextColor>
              </h4>
            </EuiFlexItem>
            {hasErrors ? (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.ingestManager.createPackageConfig.stepConfigure.inputConfigErrorsTooltip"
                      defaultMessage="Fix configuration errors"
                    />
                  }
                  position="right"
                  type="alert"
                  iconProps={{ color: 'danger' }}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.createPackageConfig.stepConfigure.inputSettingsDescription"
              defaultMessage="The following settings are applicable to all streams."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
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
                <div>
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
                </div>
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
    </EuiFlexGroup>
  );
};
