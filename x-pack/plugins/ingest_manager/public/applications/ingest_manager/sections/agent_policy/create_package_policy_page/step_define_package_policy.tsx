/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { AgentPolicy, PackageInfo, PackagePolicy, NewPackagePolicy } from '../../../types';
import { packageToPackagePolicyInputs } from '../../../services';
import { Loading } from '../../../components';
import { PackagePolicyValidationResults } from './services';

export const StepDefinePackagePolicy: React.FunctionComponent<{
  agentPolicy: AgentPolicy;
  packageInfo: PackageInfo;
  packagePolicy: NewPackagePolicy;
  updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
  validationResults: PackagePolicyValidationResults;
}> = ({ agentPolicy, packageInfo, packagePolicy, updatePackagePolicy, validationResults }) => {
  // Form show/hide states
  const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

  // Update package policy's package and agent policy info
  useEffect(() => {
    const pkg = packagePolicy.package;
    const currentPkgKey = pkg ? `${pkg.name}-${pkg.version}` : '';
    const pkgKey = `${packageInfo.name}-${packageInfo.version}`;

    // If package has changed, create shell package policy with input&stream values based on package info
    if (currentPkgKey !== pkgKey) {
      // Existing package policies on the agent policy using the package name, retrieve highest number appended to package policy name
      const pkgPoliciesNamePattern = new RegExp(`${packageInfo.name}-(\\d+)`);
      const pkgPoliciesWithMatchingNames = (agentPolicy.package_policies as PackagePolicy[])
        .filter((ds) => Boolean(ds.name.match(pkgPoliciesNamePattern)))
        .map((ds) => parseInt(ds.name.match(pkgPoliciesNamePattern)![1], 10))
        .sort();

      updatePackagePolicy({
        name:
          // For Endpoint packages, the user must fill in the name, thus we don't attempt to generate
          // a default one here.
          // FIXME: Improve package policies name uniqueness - https://github.com/elastic/kibana/issues/72948
          packageInfo.name !== 'endpoint'
            ? `${packageInfo.name}-${
                pkgPoliciesWithMatchingNames.length
                  ? pkgPoliciesWithMatchingNames[pkgPoliciesWithMatchingNames.length - 1] + 1
                  : 1
              }`
            : '',
        package: {
          name: packageInfo.name,
          title: packageInfo.title,
          version: packageInfo.version,
        },
        inputs: packageToPackagePolicyInputs(packageInfo),
      });
    }

    // If agent policy has changed, update package policy's agent policy ID and namespace
    if (packagePolicy.policy_id !== agentPolicy.id) {
      updatePackagePolicy({
        policy_id: agentPolicy.id,
        namespace: agentPolicy.namespace,
      });
    }
  }, [
    packagePolicy.package,
    packagePolicy.policy_id,
    agentPolicy,
    packageInfo,
    updatePackagePolicy,
  ]);

  return validationResults ? (
    <EuiDescribedFormGroup
      title={
        <h4>
          <FormattedMessage
            id="xpack.ingestManager.createPackagePolicy.stepConfigure.integrationSettingsSectionTitle"
            defaultMessage="Integration settings"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.ingestManager.createPackagePolicy.stepConfigure.integrationSettingsSectionDescription"
          defaultMessage="Choose a name and description to help identify how this integration will be used."
        />
      }
    >
      <>
        {/* Name */}
        <EuiFormRow
          isInvalid={!!validationResults.name}
          error={validationResults.name}
          label={
            <FormattedMessage
              id="xpack.ingestManager.createPackagePolicy.stepConfigure.packagePolicyNameInputLabel"
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

        {/* Description */}
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.ingestManager.createPackagePolicy.stepConfigure.packagePolicyDescriptionInputLabel"
              defaultMessage="Description"
            />
          }
          labelAppend={
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ingestManager.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
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
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

        {/* Advanced options toggle */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
              onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
              flush="left"
            >
              <FormattedMessage
                id="xpack.ingestManager.createPackagePolicy.stepConfigure.advancedOptionsToggleLinkText"
                defaultMessage="Advanced options"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          {!isShowingAdvanced && !!validationResults.namespace ? (
            <EuiFlexItem grow={false}>
              <EuiText color="danger" size="s">
                <FormattedMessage
                  id="xpack.ingestManager.createPackagePolicy.stepConfigure.errorCountText"
                  defaultMessage="{count, plural, one {# error} other {# errors}}"
                  values={{ count: 1 }}
                />
              </EuiText>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        {/* Advanced options content */}
        {/* Todo: Populate list of existing namespaces */}
        {isShowingAdvanced ? (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              isInvalid={!!validationResults.namespace}
              error={validationResults.namespace}
              label={
                <FormattedMessage
                  id="xpack.ingestManager.createPackagePolicy.stepConfigure.packagePolicyNamespaceInputLabel"
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
          </>
        ) : null}
      </>
    </EuiDescribedFormGroup>
  ) : (
    <Loading />
  );
};
