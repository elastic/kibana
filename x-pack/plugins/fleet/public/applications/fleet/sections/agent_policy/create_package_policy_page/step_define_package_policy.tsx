/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiText,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';

import type {
  AgentPolicy,
  PackageInfo,
  PackagePolicy,
  NewPackagePolicy,
  RegistryVarsEntry,
} from '../../../types';
import { packageToPackagePolicy, pkgKeyFromPackageInfo } from '../../../services';
import { Loading } from '../../../components';
import { useStartServices } from '../../../hooks';

import { isAdvancedVar } from './services';
import type { PackagePolicyValidationResults } from './services';
import { PackagePolicyInputVarField } from './components';

export const StepDefinePackagePolicy: React.FunctionComponent<{
  agentPolicy: AgentPolicy;
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  integrationToEnable?: string;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults;
  submitAttempted: boolean;
}> = memo(
  ({
    agentPolicy,
    packageInfo,
    packagePolicy,
    integrationToEnable,
    updatePackagePolicy,
    validationResults,
    submitAttempted,
  }) => {
    const { docLinks } = useStartServices();
    // Form show/hide states
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

    // Package-level vars
    const requiredVars: RegistryVarsEntry[] = [];
    const advancedVars: RegistryVarsEntry[] = [];

    if (packageInfo.vars) {
      packageInfo.vars.forEach((varDef) => {
        if (isAdvancedVar(varDef)) {
          advancedVars.push(varDef);
        } else {
          requiredVars.push(varDef);
        }
      });
    }

    // Update package policy's package and agent policy info
    useEffect(() => {
      const pkg = packagePolicy.package;
      const currentPkgKey = pkg ? pkgKeyFromPackageInfo(pkg) : '';
      const pkgKey = pkgKeyFromPackageInfo(packageInfo);

      // If package has changed, create shell package policy with input&stream values based on package info
      if (currentPkgKey !== pkgKey) {
        // Existing package policies on the agent policy using the package name, retrieve highest number appended to package policy name
        const pkgPoliciesNamePattern = new RegExp(`${packageInfo.name}-(\\d+)`);
        const pkgPoliciesWithMatchingNames = (agentPolicy.package_policies as PackagePolicy[])
          .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
          .map((ds) => parseInt(ds.name.match(pkgPoliciesNamePattern)![1], 10))
          .sort((a, b) => a - b);

        updatePackagePolicy(
          packageToPackagePolicy(
            packageInfo,
            agentPolicy.id,
            packagePolicy.output_id,
            packagePolicy.namespace,
            `${packageInfo.name}-${
              pkgPoliciesWithMatchingNames.length
                ? pkgPoliciesWithMatchingNames[pkgPoliciesWithMatchingNames.length - 1] + 1
                : 1
            }`,
            packagePolicy.description,
            integrationToEnable
          )
        );
      }

      // If agent policy has changed, update package policy's agent policy ID and namespace
      if (packagePolicy.policy_id !== agentPolicy.id) {
        updatePackagePolicy({
          policy_id: agentPolicy.id,
          namespace: agentPolicy.namespace,
        });
      }
    }, [packagePolicy, agentPolicy, packageInfo, updatePackagePolicy, integrationToEnable]);

    return validationResults ? (
      <EuiDescribedFormGroup
        title={
          <h4>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.stepConfigure.integrationSettingsSectionTitle"
              defaultMessage="Integration settings"
            />
          </h4>
        }
        description={
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.integrationSettingsSectionDescription"
            defaultMessage="Choose a name and description to help identify how this integration will be used."
          />
        }
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          {/* Name */}
          <EuiFlexItem>
            <EuiFormRow
              isInvalid={!!validationResults.name}
              error={validationResults.name}
              label={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNameInputLabel"
                  defaultMessage="Integration name"
                />
              }
            >
              <EuiFieldText
                value={packagePolicy.name}
                onChange={(e) =>
                  updatePackagePolicy({
                    name: e.target.value,
                  })
                }
                data-test-subj="packagePolicyNameInput"
              />
            </EuiFormRow>
          </EuiFlexItem>

          {/* Description */}
          <EuiFlexItem>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyDescriptionInputLabel"
                  defaultMessage="Description"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceHelpLabel"
                  defaultMessage="Change the default namespace inherited from the selected Agent policy. This setting changes the name of the integration's data stream. {learnMore}."
                  values={{
                    learnMore: (
                      <EuiLink href={docLinks.links.fleet.datastreamsNamingScheme} target="_blank">
                        {i18n.translate(
                          'xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceHelpLearnMoreLabel',
                          { defaultMessage: 'Learn more' }
                        )}
                      </EuiLink>
                    ),
                  }}
                />
              }
              labelAppend={
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
                    defaultMessage="Optional"
                  />
                </EuiText>
              }
              isInvalid={!!validationResults.description}
              error={validationResults.description}
            >
              <EuiFieldText
                value={packagePolicy.description}
                onChange={(e) =>
                  updatePackagePolicy({
                    description: e.target.value,
                  })
                }
                data-test-subj="packagePolicyDescriptionInput"
              />
            </EuiFormRow>
          </EuiFlexItem>

          {/* Required vars */}
          {requiredVars.map((varDef) => {
            const { name: varName, type: varType } = varDef;
            if (!packagePolicy.vars || !packagePolicy.vars[varName]) return null;
            const value = packagePolicy.vars[varName].value;
            return (
              <EuiFlexItem key={varName}>
                <PackagePolicyInputVarField
                  varDef={varDef}
                  value={value}
                  onChange={(newValue: any) => {
                    updatePackagePolicy({
                      vars: {
                        ...packagePolicy.vars,
                        [varName]: {
                          type: varType,
                          value: newValue,
                        },
                      },
                    });
                  }}
                  errors={validationResults.vars![varName]}
                  forceShowErrors={submitAttempted}
                />
              </EuiFlexItem>
            );
          })}

          {/* Advanced options toggle */}
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
                    id="xpack.fleet.createPackagePolicy.stepConfigure.advancedOptionsToggleLinkText"
                    defaultMessage="Advanced options"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              {!isShowingAdvanced && !!validationResults.namespace ? (
                <EuiFlexItem grow={false}>
                  <EuiText color="danger" size="s">
                    <FormattedMessage
                      id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                      defaultMessage="{count, plural, one {# error} other {# errors}}"
                      values={{ count: 1 }}
                    />
                  </EuiText>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>

          {/* Advanced options content */}
          {/* Todo: Populate list of existing namespaces */}
          {isShowingAdvanced ? (
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiFormRow
                    isInvalid={!!validationResults.namespace}
                    error={validationResults.namespace}
                    label={
                      <FormattedMessage
                        id="xpack.fleet.createPackagePolicy.stepConfigure.packagePolicyNamespaceInputLabel"
                        defaultMessage="Namespace"
                      />
                    }
                  >
                    <EuiComboBox
                      noSuggestions
                      singleSelection={true}
                      selectedOptions={
                        packagePolicy.namespace ? [{ label: packagePolicy.namespace }] : []
                      }
                      onCreateOption={(newNamespace: string) => {
                        updatePackagePolicy({
                          namespace: newNamespace,
                        });
                      }}
                      onChange={(newNamespaces: Array<{ label: string }>) => {
                        updatePackagePolicy({
                          namespace: newNamespaces.length ? newNamespaces[0].label : '',
                        });
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                {/* Advanced vars */}
                {advancedVars.map((varDef) => {
                  const { name: varName, type: varType } = varDef;
                  if (!packagePolicy.vars || !packagePolicy.vars[varName]) return null;
                  const value = packagePolicy.vars![varName].value;
                  return (
                    <EuiFlexItem key={varName}>
                      <PackagePolicyInputVarField
                        varDef={varDef}
                        value={value}
                        onChange={(newValue: any) => {
                          updatePackagePolicy({
                            vars: {
                              ...packagePolicy.vars,
                              [varName]: {
                                type: varType,
                                value: newValue,
                              },
                            },
                          });
                        }}
                        errors={validationResults.vars![varName]}
                        forceShowErrors={submitAttempted}
                      />
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiDescribedFormGroup>
    ) : (
      <Loading />
    );
  }
);
