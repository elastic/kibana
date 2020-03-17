/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSteps,
  EuiPanel,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiButton,
  EuiComboBox,
} from '@elastic/eui';
import {
  AgentConfig,
  PackageInfo,
  Datasource,
  NewDatasource,
  DatasourceInput,
} from '../../../types';
import { packageToConfigDatasourceInputs } from '../../../services';
import { DatasourceInputPanel } from './components';

export const StepConfigureDatasource: React.FunctionComponent<{
  agentConfig: AgentConfig;
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  backLink: JSX.Element;
  cancelUrl: string;
  onNext: () => void;
}> = ({ agentConfig, packageInfo, datasource, updateDatasource, backLink, cancelUrl, onNext }) => {
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

  // Step A, define datasource
  const DefineDatasource = (
    <EuiPanel>
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepConfigure.datasourceNameInputLabel"
                defaultMessage="Data source name"
              />
            }
          >
            <EuiFieldText
              value={datasource.name}
              onChange={e =>
                updateDatasource({
                  name: e.target.value,
                })
              }
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
          >
            <EuiFieldText
              value={datasource.description}
              onChange={e =>
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
    </EuiPanel>
  );

  // Step B, configure inputs (and their streams)
  // Assume packages only export one datasource for now
  const ConfigureInputs =
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

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>{backLink}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSteps
              steps={[
                {
                  title: i18n.translate(
                    'xpack.ingestManager.createDatasource.stepConfigure.defineDatasourceTitle',
                    {
                      defaultMessage: 'Define your datasource',
                    }
                  ),
                  children: DefineDatasource,
                },
                {
                  title: i18n.translate(
                    'xpack.ingestManager.createDatasource.stepConfigure.chooseDataTitle',
                    {
                      defaultMessage: 'Choose the data you want to collect',
                    }
                  ),
                  children: ConfigureInputs,
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={cancelUrl}>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.cancelLinkText"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="arrowRight" iconSide="right" onClick={() => onNext()}>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.continueButtonText"
                defaultMessage="Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
