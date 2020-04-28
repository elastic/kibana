/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  AgentConfig,
  PackageInfo,
  Datasource,
  NewDatasource,
  DatasourceInput,
} from '../../../types';
import { Loading } from '../../../components';
import { packageToConfigDatasourceInputs } from '../../../services';
import { DatasourceValidationResults, validationHasErrors } from './services';
import { DatasourceInputPanel } from './components';

export const StepConfigureDatasource: React.FunctionComponent<{
  agentConfig: AgentConfig;
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  validationResults: DatasourceValidationResults;
  submitAttempted: boolean;
}> = ({
  agentConfig,
  packageInfo,
  datasource,
  updateDatasource,
  validationResults,
  submitAttempted,
}) => {
  const hasErrors = validationResults ? validationHasErrors(validationResults) : false;

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
        .filter(ds => Boolean(ds.name.match(dsPackageNamePattern)))
        .map(ds => parseInt(ds.name.match(dsPackageNamePattern)![1], 10))
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

  // Step B, configure inputs (and their streams)
  // Assume packages only export one datasource for now
  const renderConfigureInputs = () =>
    packageInfo.datasources &&
    packageInfo.datasources[0] &&
    packageInfo.datasources[0].inputs &&
    packageInfo.datasources[0].inputs.length ? (
      <EuiFlexGroup direction="column">
        {packageInfo.datasources[0].inputs.map(packageInput => {
          const datasourceInput = datasource.inputs.find(input => input.type === packageInput.type);
          return datasourceInput ? (
            <EuiFlexItem key={packageInput.type}>
              <DatasourceInputPanel
                packageInput={packageInput}
                datasourceInput={datasourceInput}
                updateDatasourceInput={(updatedInput: Partial<DatasourceInput>) => {
                  const indexOfUpdatedInput = datasource.inputs.findIndex(
                    input => input.type === packageInput.type
                  );
                  const newInputs = [...datasource.inputs];
                  newInputs[indexOfUpdatedInput] = {
                    ...newInputs[indexOfUpdatedInput],
                    ...updatedInput,
                  };
                  updateDatasource({
                    inputs: newInputs,
                  });
                }}
                inputValidationResults={validationResults!.inputs![datasourceInput.type]}
                forceShowErrors={submitAttempted}
              />
            </EuiFlexItem>
          ) : null;
        })}
      </EuiFlexGroup>
    ) : (
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="checkInCircleFilled"
          iconColor="secondary"
          body={
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepConfigure.noConfigOptionsMessage"
                  defaultMessage="Nothing to configure"
                />
              </p>
            </EuiText>
          }
        />
      </EuiPanel>
    );

  return validationResults ? (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{renderConfigureInputs()}</EuiFlexItem>
      {hasErrors && submitAttempted ? (
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.ingestManager.createDatasource.stepConfigure.validationErrorTitle',
              {
                defaultMessage: 'Your data source configuration has errors',
              }
            )}
            color="danger"
          >
            <p>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepConfigure.validationErrorText"
                defaultMessage="Please fix the above errors before continuing"
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : (
    <Loading />
  );
};
