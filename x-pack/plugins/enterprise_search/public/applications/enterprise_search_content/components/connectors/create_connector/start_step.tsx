/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors/types/connectors';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

import * as Constants from '../../../../shared/constants';
import { GeneratedConfigFields } from '../../connector_detail/components/generated_config_fields';
import { DeploymentLogic } from '../../connector_detail/deployment_logic';

import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';
import { ManualConfiguration } from './components/manual_configuration';
import { CreateConnectorLogic } from './create_connector_logic';

interface StartStepProps {
  allConnectors: ConnectorDefinition[];
  connector: Connector;
  connectorName: string;
  connectorSelected: ConnectorDefinition;
  currentStep: number;
  error?: string | React.ReactNode;
  isNextStepEnabled: boolean;
  onNameChange?(name: string): void;
  onSubmit(name: string): void;
  selfManaged: boolean;
  setConnectorName: Function;
  setConnectorSelected: Function;
  setCurrentStep: Function;
  setNextStepEnabled: Function;
  setSelfManaged: Function;
  title: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  setSelfManaged,
  title,
  selfManaged,
  setConnectorSelected,
  connectorSelected,
  allConnectors,
  connectorName,
  setConnectorName,
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
  setNextStepEnabled,
  connector,
  onNameChange,
  onSubmit,
  error,
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const [radioIdSelected, setRadioIdSelected] = useState(
    selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId
  );
  const { isGenerateLoading } = useValues(DeploymentLogic);
  const { setNewConnectorServiceType } = useActions(CreateConnectorLogic);

  // FORM

  const { fullIndexName, fullIndexNameExists, fullIndexNameIsValid, rawName } =
    useValues(NewConnectorLogic);
  const { setRawName, generateConnectorName } = useActions(NewConnectorLogic);
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
    if (onNameChange) {
      onNameChange(fullIndexName);
    }
  };

  const selectNewConnector = (connector: ConnectorDefinition) => {
    if (rawName === '') {
      generateConnectorName({ connectorType: connector.serviceType });
    }
    setNewConnectorServiceType(connector.serviceType);
    setConnectorSelected(connector);
  };
  const formInvalid = !!error || fullIndexNameExists || !fullIndexNameIsValid;

  const formError = () => {
    if (fullIndexNameExists) {
      // TODO: connector with same name is allowed.
      return i18n.translate(
        'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.alreadyExists.error',
        {
          defaultMessage: 'A connector with the name {connectorName} already exists',
          values: {
            connectorName: fullIndexName,
          },
        }
      );
    }
    if (!fullIndexNameIsValid) {
      // TODO: make sure to use name stripping logic
      return i18n.translate(
        'xpack.enterpriseSearch.content.newConnector.newConnectorTemplate.isInvalid.error',
        {
          defaultMessage: '{connectorName} is an invalid connector name',
          values: {
            connectorName: fullIndexName,
          },
        }
      );
    }
    return error;
  };
  // END FORM
  useEffect(() => {
    setSelfManaged(radioIdSelected === selfManagedRadioButtonId ? true : false);
  }, [radioIdSelected]);
  useEffect(() => {
    setRadioIdSelected(selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId);
  }, [selfManaged]);

  useEffect(() => {
    if (connectorSelected && connectorSelected.name !== '') {
      // TODO: self managed should be calculated by the logic
      if (!connectorSelected.isNative && !selfManaged) {
        setSelfManaged(true);
      }
      // const name = // TODO: replace with logic
      //  connectorSelected.name
      //    .toLocaleLowerCase()
      //    .replace(/[^\w-]/g, '')
      //    .replace(/ /g, '-') + '-aa3f';
      // setConnectorName(name);
    }
  }, [connectorSelected]);

  return (
    <EuiForm component="form" id="enterprise-search-create-connector">
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Start */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorLabel',
                    { defaultMessage: 'Connector' }
                  )}
                >
                  <ChooseConnectorSelectable
                    selfManaged={selfManaged}
                    setConnectorSelected={selectNewConnector}
                    connectorSelected={connectorSelected}
                    allConnectors={allConnectors}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  isInvalid={formInvalid}
                  error={formError()}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={fullIndexName}
                    onChange={handleNameChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.descriptionLabel',
                  { defaultMessage: 'Description' }
                )}
              >
                <EuiFieldText
                  data-test-subj="enterpriseSearchStartStepFieldText"
                  fullWidth
                  name="first"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
        {/* Set up */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="s">
              <h4>
                {i18n.translate('xpack.enterpriseSearch.createConnector.startStep.h4.setUpLabel', {
                  defaultMessage: 'Set up',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.startStep.p.whereDoYouWantLabel',
                  {
                    defaultMessage:
                      'Where do you want to store the connector and how do you want to manage it?',
                  }
                )}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiRadio.elasticManagedLabel',
                    { defaultMessage: 'Elastic managed' }
                  )}
                  checked={!selfManaged}
                  disabled={connectorSelected.isNative === false}
                  onChange={() => setRadioIdSelected(elasticManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover
                  isDisabled={connectorSelected.isNative === false}
                  isNative
                />
              </EuiFlexItem>
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiRadio.selfManagedLabel',
                    { defaultMessage: 'Self managed' }
                  )}
                  checked={selfManaged}
                  onChange={() => setRadioIdSelected(selfManagedRadioButtonId)}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isDisabled={false} isNative={false} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {selfManaged ? (
          <EuiFlexItem>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="l"
              color={connectorSelected.name !== '' && connectorName !== '' ? 'plain' : 'subdued'}
            >
              <EuiText
                color={
                  connectorSelected.name !== '' && connectorName !== '' ? 'default' : 'subdued'
                }
              >
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.h4.deploymentLabel',
                    {
                      defaultMessage: 'Deployment',
                    }
                  )}
                </h3>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiText
                color={
                  connectorSelected.name !== '' && connectorName !== '' ? 'default' : 'subdued'
                }
                size="s"
              >
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.p.youWillStartTheLabel',
                    {
                      defaultMessage:
                        'You will start the process of creating a new index, API key, and a Web Crawler Connector ID manually. Optionally you can bring your own configuration as well.',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                data-test-subj="enterpriseSearchStartStepNextButton"
                onClick={() => setCurrentStep(currentStep + 1)}
                fill
                disabled={connectorSelected.name === '' || connectorName === ''}
              >
                {Constants.NEXT_BUTTON_LABEL}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiPanel
              color={connectorSelected.name !== '' && connectorName !== '' ? 'plain' : 'subdued'}
              hasShadow={false}
              hasBorder
              paddingSize="l"
            >
              <EuiText
                color={
                  connectorSelected.name !== '' && connectorName !== '' ? 'default' : 'subdued'
                }
              >
                <h3>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.h4.configureIndexAndAPILabel',
                    {
                      defaultMessage: 'Configure index and API key',
                    }
                  )}
                </h3>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiText
                color={
                  connectorSelected.name !== '' && connectorName !== '' ? 'default' : 'subdued'
                }
                size="s"
              >
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.p.thisProcessWillCreateLabel',
                    {
                      defaultMessage:
                        'This process will create a new index, API key, and a Connector ID. Optionally you can bring your own configuration as well.',
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              {isNextStepEnabled ? (
                <>
                  <GeneratedConfigFields
                    apiKey={{
                      api_key: 'asd234fsdfsdfsd234',
                      encoded: 'asdasd234fsdfsdf',
                      id: 'string',
                      name: 'my-api-key',
                    }}
                    connector={connector}
                    generateApiKey={() => {}}
                    isGenerateLoading={false}
                  />
                  <EuiSpacer size="m" />
                  <EuiButton
                    data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
                    fill
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    {Constants.NEXT_BUTTON_LABEL}
                  </EuiButton>
                </>
              ) : (
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="entSearchContent-connector-configuration-generateConfigButton"
                      data-telemetry-id="entSearchContent-connector-configuration-generateConfigButton"
                      disabled={connectorSelected.name === '' || connectorName === ''}
                      fill
                      iconType="sparkles"
                      isLoading={isGenerateLoading}
                      onClick={() => {
                        onSubmit(fullIndexName);
                        setNextStepEnabled(true);
                        setTimeout(() => {
                          window.scrollTo({
                            behavior: 'smooth',
                            top: window.innerHeight,
                          });
                        }, 100);
                      }}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.connector_detail.configurationConnector.steps.generateApiKey.button.label',
                        {
                          defaultMessage: 'Generate configuration',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ManualConfiguration
                      isDisabled={connectorSelected.name === '' || connectorName === ''}
                      connectorName={connectorName}
                      setConnectorName={setConnectorName}
                      connector={connector}
                      setIsNextStepEnabled={setNextStepEnabled}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiPanel>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiForm>
  );
};
