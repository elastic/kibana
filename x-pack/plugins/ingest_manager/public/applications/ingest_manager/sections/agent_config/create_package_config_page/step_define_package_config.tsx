/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
  EuiComboBox,
} from '@elastic/eui';
import { AgentConfig, PackageInfo, PackageConfig, NewPackageConfig } from '../../../types';
import { packageToPackageConfigInputs } from '../../../services';
import { Loading } from '../../../components';
import { PackageConfigValidationResults } from './services';

export const StepDefinePackageConfig: React.FunctionComponent<{
  agentConfig: AgentConfig;
  packageInfo: PackageInfo;
  packageConfig: NewPackageConfig;
  updatePackageConfig: (fields: Partial<NewPackageConfig>) => void;
  validationResults: PackageConfigValidationResults;
}> = ({ agentConfig, packageInfo, packageConfig, updatePackageConfig, validationResults }) => {
  // Form show/hide states
  const [isShowingAdvancedDefine, setIsShowingAdvancedDefine] = useState<boolean>(false);

  // Update package config's package and config info
  useEffect(() => {
    const pkg = packageConfig.package;
    const currentPkgKey = pkg ? `${pkg.name}-${pkg.version}` : '';
    const pkgKey = `${packageInfo.name}-${packageInfo.version}`;

    // If package has changed, create shell package config with input&stream values based on package info
    if (currentPkgKey !== pkgKey) {
      // Existing package configs on the agent config using the package name, retrieve highest number appended to package config name
      const dsPackageNamePattern = new RegExp(`${packageInfo.name}-(\\d+)`);
      const dsWithMatchingNames = (agentConfig.package_configs as PackageConfig[])
        .filter((ds) => Boolean(ds.name.match(dsPackageNamePattern)))
        .map((ds) => parseInt(ds.name.match(dsPackageNamePattern)![1], 10))
        .sort();

      updatePackageConfig({
        name: `${packageInfo.name}-${
          dsWithMatchingNames.length ? dsWithMatchingNames[dsWithMatchingNames.length - 1] + 1 : 1
        }`,
        package: {
          name: packageInfo.name,
          title: packageInfo.title,
          version: packageInfo.version,
        },
        inputs: packageToPackageConfigInputs(packageInfo),
      });
    }

    // If agent config has changed, update package config's config ID and namespace
    if (packageConfig.config_id !== agentConfig.id) {
      updatePackageConfig({
        config_id: agentConfig.id,
        namespace: agentConfig.namespace,
      });
    }
  }, [
    packageConfig.package,
    packageConfig.config_id,
    agentConfig,
    packageInfo,
    updatePackageConfig,
  ]);

  return validationResults ? (
    <>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            isInvalid={!!validationResults.name}
            error={validationResults.name}
            label={
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.stepConfigure.packageConfigNameInputLabel"
                defaultMessage="Integration name"
              />
            }
          >
            <EuiFieldText
              value={packageConfig.name}
              onChange={(e) =>
                updatePackageConfig({
                  name: e.target.value,
                })
              }
              data-test-subj="packageConfigNameInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.createPackageConfig.stepConfigure.packageConfigDescriptionInputLabel"
                defaultMessage="Description"
              />
            }
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.ingestManager.createPackageConfig.stepConfigure.inputVarFieldOptionalLabel"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
            isInvalid={!!validationResults.description}
            error={validationResults.description}
          >
            <EuiFieldText
              value={packageConfig.description}
              onChange={(e) =>
                updatePackageConfig({
                  description: e.target.value,
                })
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        flush="left"
        size="xs"
        iconType={isShowingAdvancedDefine ? 'arrowUp' : 'arrowDown'}
        onClick={() => setIsShowingAdvancedDefine(!isShowingAdvancedDefine)}
      >
        <FormattedMessage
          id="xpack.ingestManager.createPackageConfig.stepConfigure.advancedOptionsToggleLinkText"
          defaultMessage="Advanced options"
        />
      </EuiButtonEmpty>
      {/* Todo: Populate list of existing namespaces */}
      {isShowingAdvancedDefine || !!validationResults.namespace ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiFormRow
                isInvalid={!!validationResults.namespace}
                error={validationResults.namespace}
                label={
                  <FormattedMessage
                    id="xpack.ingestManager.createPackageConfig.stepConfigure.packageConfigNamespaceInputLabel"
                    defaultMessage="Namespace"
                  />
                }
              >
                <EuiComboBox
                  noSuggestions
                  singleSelection={true}
                  selectedOptions={
                    packageConfig.namespace ? [{ label: packageConfig.namespace }] : []
                  }
                  onCreateOption={(newNamespace: string) => {
                    updatePackageConfig({
                      namespace: newNamespace,
                    });
                  }}
                  onChange={(newNamespaces: Array<{ label: string }>) => {
                    updatePackageConfig({
                      namespace: newNamespaces.length ? newNamespaces[0].label : '',
                    });
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGrid>
        </Fragment>
      ) : null}
    </>
  ) : (
    <Loading />
  );
};
