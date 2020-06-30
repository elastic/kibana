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
import { AgentConfig, PackageInfo, Datasource, NewDatasource } from '../../../types';
import { packageToConfigDatasourceInputs } from '../../../services';
import { Loading } from '../../../components';
import { DatasourceValidationResults } from './services';

export const StepDefineDatasource: React.FunctionComponent<{
  agentConfig: AgentConfig;
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  validationResults: DatasourceValidationResults;
}> = ({ agentConfig, packageInfo, datasource, updateDatasource, validationResults }) => {
  // Form show/hide states
  const [isShowingAdvancedDefine, setIsShowingAdvancedDefine] = useState<boolean>(false);

  // Update datasource's package and config info
  useEffect(() => {
    const dsPackage = datasource.package;
    const currentPkgKey = dsPackage ? `${dsPackage.name}-${dsPackage.version}` : '';
    const pkgKey = `${packageInfo.name}-${packageInfo.version}`;

    // If package has changed, create shell datasource with input&stream values based on package info
    if (currentPkgKey !== pkgKey) {
      // Existing datasources on the agent config using the package name, retrieve highest number appended to datasource name
      const dsPackageNamePattern = new RegExp(`${packageInfo.name}-(\\d+)`);
      const dsWithMatchingNames = (agentConfig.datasources as Datasource[])
        .filter((ds) => Boolean(ds.name.match(dsPackageNamePattern)))
        .map((ds) => parseInt(ds.name.match(dsPackageNamePattern)![1], 10))
        .sort();

      updateDatasource({
        name: `${packageInfo.name}-${
          dsWithMatchingNames.length ? dsWithMatchingNames[dsWithMatchingNames.length - 1] + 1 : 1
        }`,
        package: {
          name: packageInfo.name,
          title: packageInfo.title,
          version: packageInfo.version,
        },
        inputs: packageToConfigDatasourceInputs(packageInfo),
      });
    }

    // If agent config has changed, update datasource's config ID and namespace
    if (datasource.config_id !== agentConfig.id) {
      updateDatasource({
        config_id: agentConfig.id,
        namespace: agentConfig.namespace,
      });
    }
  }, [datasource.package, datasource.config_id, agentConfig, packageInfo, updateDatasource]);

  return validationResults ? (
    <>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            isInvalid={!!validationResults.name}
            error={validationResults.name}
            label={
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepConfigure.datasourceNameInputLabel"
                defaultMessage="Data source name"
              />
            }
          >
            <EuiFieldText
              value={datasource.name}
              onChange={(e) =>
                updateDatasource({
                  name: e.target.value,
                })
              }
              data-test-subj="datasourceNameInput"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepConfigure.datasourceDescriptionInputLabel"
                defaultMessage="Description"
              />
            }
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepConfigure.inputVarFieldOptionalLabel"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
            isInvalid={!!validationResults.description}
            error={validationResults.description}
          >
            <EuiFieldText
              value={datasource.description}
              onChange={(e) =>
                updateDatasource({
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
          id="xpack.ingestManager.createDatasource.stepConfigure.advancedOptionsToggleLinkText"
          defaultMessage="Advanced options"
        />
      </EuiButtonEmpty>
      {/* Todo: Populate list of existing namespaces */}
      {isShowingAdvancedDefine ? (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ingestManager.createDatasource.stepConfigure.datasourceNamespaceInputLabel"
                    defaultMessage="Namespace"
                  />
                }
              >
                <EuiComboBox
                  noSuggestions
                  singleSelection={true}
                  selectedOptions={datasource.namespace ? [{ label: datasource.namespace }] : []}
                  onCreateOption={(newNamespace: string) => {
                    updateDatasource({
                      namespace: newNamespace,
                    });
                  }}
                  onChange={(newNamespaces: Array<{ label: string }>) => {
                    updateDatasource({
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
