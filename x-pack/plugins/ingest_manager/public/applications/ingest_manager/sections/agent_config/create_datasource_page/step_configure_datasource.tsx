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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonEmpty,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiButton,
  EuiComboBox,
  EuiCallOut,
} from '@elastic/eui';
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
import { DatasourceInputPanel, DatasourceInputVarField } from './components';

export const StepConfigureDatasource: React.FunctionComponent<{
  agentConfig: AgentConfig;
  packageInfo: PackageInfo;
  datasource: NewDatasource;
  updateDatasource: (fields: Partial<NewDatasource>) => void;
  validationResults: DatasourceValidationResults;
  backLink: JSX.Element;
  cancelUrl: string;
  onNext: () => void;
}> = ({
  agentConfig,
  packageInfo,
  datasource,
  updateDatasource,
  validationResults,
  backLink,
  cancelUrl,
  onNext,
}) => {
  // Form show/hide states
  const [isShowingAdvancedDefine, setIsShowingAdvancedDefine] = useState<boolean>(false);

  // Form submit state
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
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

  // Step A, define datasource
  const renderDefineDatasource = () => (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <DatasourceInputVarField
            varDef={{
              name: 'name',
              title: i18n.translate(
                'xpack.ingestManager.createDatasource.stepConfigure.datasourceNameInputLabel',
                {
                  defaultMessage: 'Data source name',
                }
              ),
              type: 'text',
              required: true,
            }}
            value={datasource.name}
            onChange={(newValue: any) => {
              updateDatasource({
                name: newValue,
              });
            }}
            errors={validationResults!.name}
            forceShowErrors={submitAttempted}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <DatasourceInputVarField
            varDef={{
              name: 'description',
              title: i18n.translate(
                'xpack.ingestManager.createDatasource.stepConfigure.datasourceDescriptionInputLabel',
                {
                  defaultMessage: 'Description',
                }
              ),
              type: 'text',
              required: false,
            }}
            value={datasource.description}
            onChange={(newValue: any) => {
              updateDatasource({
                description: newValue,
              });
            }}
            errors={validationResults!.description}
            forceShowErrors={submitAttempted}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
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
          <EuiFlexGroup>
            <EuiFlexItem grow={1}>
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
            <EuiFlexItem grow={1} />
          </EuiFlexGroup>
        </Fragment>
      ) : null}
    </EuiPanel>
  );

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
                  children: renderDefineDatasource(),
                },
                {
                  title: i18n.translate(
                    'xpack.ingestManager.createDatasource.stepConfigure.chooseDataTitle',
                    {
                      defaultMessage: 'Choose the data you want to collect',
                    }
                  ),
                  children: renderConfigureInputs(),
                },
              ]}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {hasErrors && submitAttempted ? (
        <EuiFlexItem>
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
            <EuiButton
              fill
              iconType="arrowRight"
              iconSide="right"
              onClick={() => {
                setSubmitAttempted(true);
                if (!hasErrors) {
                  onNext();
                }
              }}
            >
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.continueButtonText"
                defaultMessage="Continue"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <Loading />
  );
};
