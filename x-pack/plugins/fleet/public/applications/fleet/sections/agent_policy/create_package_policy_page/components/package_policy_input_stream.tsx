/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import type {
  NewPackagePolicyInputStream,
  RegistryStream,
  RegistryVarsEntry,
} from '../../../../types';
import type { PackagePolicyConfigValidationResults } from '../services';
import { isAdvancedVar, validationHasErrors } from '../services';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';

const FlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: calc(50% - ${(props) => props.theme.eui.euiSizeL});
`;

export const PackagePolicyInputStreamConfig: React.FunctionComponent<{
  packageInputStream: RegistryStream;
  packagePolicyInputStream: NewPackagePolicyInputStream;
  updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
  inputStreamValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    packageInputStream,
    packagePolicyInputStream,
    updatePackagePolicyInputStream,
    inputStreamValidationResults,
    forceShowErrors,
  }) => {
    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>();

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputStreamValidationResults);

    const requiredVars: RegistryVarsEntry[] = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const advancedVarsWithErrorsCount: number = useMemo(
      () =>
        advancedVars.filter(
          ({ name: varName }) => inputStreamValidationResults?.vars?.[varName]?.length
        ).length,
      [advancedVars, inputStreamValidationResults?.vars]
    );

    return (
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="flexStart">
            <EuiFlexItem grow={1} />
            <EuiFlexItem grow={5}>
              <EuiSwitch
                label={packageInputStream.title}
                disabled={packagePolicyInputStream.keep_enabled}
                checked={packagePolicyInputStream.enabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  updatePackagePolicyInputStream({
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
          </EuiFlexGroup>
        </EuiFlexItem>
        <FlexItemWithMaxWidth>
          <EuiFlexGroup direction="column" gutterSize="m">
            {requiredVars.map((varDef) => {
              if (!packagePolicyInputStream?.vars) return null;
              const { name: varName, type: varType } = varDef;
              const varConfigEntry = packagePolicyInputStream.vars?.[varName];
              const value = varConfigEntry?.value;
              const frozen = varConfigEntry?.frozen ?? false;

              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    frozen={frozen}
                    onChange={(newValue: any) => {
                      updatePackagePolicyInputStream({
                        vars: {
                          ...packagePolicyInputStream.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={inputStreamValidationResults?.vars![varName]}
                    forceShowErrors={forceShowErrors}
                  />
                </EuiFlexItem>
              );
            })}
            {advancedVars.length ? (
              <Fragment>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                        onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                        flush="left"
                      >
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
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
                      if (!packagePolicyInputStream.vars) return null;
                      const { name: varName, type: varType } = varDef;
                      const value = packagePolicyInputStream.vars?.[varName]?.value;

                      return (
                        <EuiFlexItem key={varName}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackagePolicyInputStream({
                                vars: {
                                  ...packagePolicyInputStream.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={inputStreamValidationResults?.vars![varName]}
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
