/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiTextColor,
  EuiIconTip,
} from '@elastic/eui';
import { PackageConfigInputStream, RegistryStream, RegistryVarsEntry } from '../../../../types';
import {
  isAdvancedVar,
  PackageConfigConfigValidationResults,
  validationHasErrors,
} from '../services';
import { PackageConfigInputVarField } from './package_config_input_var_field';

export const PackageConfigInputStreamConfig: React.FunctionComponent<{
  packageInputStream: RegistryStream;
  packageConfigInputStream: PackageConfigInputStream;
  updatePackageConfigInputStream: (updatedStream: Partial<PackageConfigInputStream>) => void;
  inputStreamValidationResults: PackageConfigConfigValidationResults;
  forceShowErrors?: boolean;
}> = ({
  packageInputStream,
  packageConfigInputStream,
  updatePackageConfigInputStream,
  inputStreamValidationResults,
  forceShowErrors,
}) => {
  // Showing advanced options toggle state
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  // Errors state
  const hasErrors = forceShowErrors && validationHasErrors(inputStreamValidationResults);

  const requiredVars: RegistryVarsEntry[] = [];
  const advancedVars: RegistryVarsEntry[] = [];

  if (packageInputStream.vars && packageInputStream.vars.length) {
    packageInputStream.vars.forEach((varDef) => {
      if (isAdvancedVar(varDef)) {
        advancedVars.push(varDef);
      } else {
        requiredVars.push(varDef);
      }
    });
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiSwitch
          label={
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiTextColor color={hasErrors ? 'danger' : 'default'}>
                  {packageInputStream.title}
                </EuiTextColor>
              </EuiFlexItem>
              {hasErrors ? (
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={
                      <FormattedMessage
                        id="xpack.ingestManager.createPackageConfig.stepConfigure.streamLevelErrorsTooltip"
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
          }
          checked={packageConfigInputStream.enabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            updatePackageConfigInputStream({
              enabled,
            });
          }}
        />
        {packageInputStream.description ? (
          <Fragment>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <ReactMarkdown source={packageInputStream.description} />
            </EuiText>
          </Fragment>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {requiredVars.map((varDef) => {
            const { name: varName, type: varType } = varDef;
            const value = packageConfigInputStream.vars![varName].value;
            return (
              <EuiFlexItem key={varName}>
                <PackageConfigInputVarField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updatePackageConfigInputStream({
                      vars: {
                        ...packageConfigInputStream.vars,
                        [varName]: {
                          type: varType,
                          value: newValue,
                        },
                      },
                    });
                  }}
                  errors={inputStreamValidationResults.vars![varName]}
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
                    const value = packageConfigInputStream.vars![varName].value;
                    return (
                      <EuiFlexItem key={varName}>
                        <PackageConfigInputVarField
                          varDef={varDef}
                          value={value}
                          onChange={(newValue: any) => {
                            updatePackageConfigInputStream({
                              vars: {
                                ...packageConfigInputStream.vars,
                                [varName]: {
                                  type: varType,
                                  value: newValue,
                                },
                              },
                            });
                          }}
                          errors={inputStreamValidationResults.vars![varName]}
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
