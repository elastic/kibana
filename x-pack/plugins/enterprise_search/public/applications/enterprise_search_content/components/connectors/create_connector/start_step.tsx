/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';

import { GenerateConfigButton } from '../../connector_detail/components/generate_config_button';
import { GeneratedConfigFields } from '../../connector_detail/components/generated_config_fields';
import { ConnectorViewValues } from '../../connector_detail/connector_view_logic';
import { DeploymentLogic } from '../../connector_detail/deployment_logic';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';
import { ManualConfiguration } from './components/manual_configuration';

interface StartStepProps {
  allConnectors: ConnectorDefinition[];
  connector: ConnectorViewValues;
  connectorName: string;
  connectorSelected: ConnectorDefinition;
  currentStep: number;
  isNextStepEnabled: boolean;
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
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const [radioIdSelected, setRadioIdSelected] = useState(
    selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId
  );

  // const { generateConfiguration } = useActions(DeploymentLogic);
  const { isGenerateLoading } = useValues(DeploymentLogic);

  useEffect(() => {
    setSelfManaged(radioIdSelected === selfManagedRadioButtonId ? true : false);
  }, [radioIdSelected]);
  useEffect(() => {
    setRadioIdSelected(selfManaged ? selfManagedRadioButtonId : elasticManagedRadioButtonId);
  }, [selfManaged]);

  useEffect(() => {
    // console.log('connectorSelected', connectorSelected);
    if (connectorSelected && connectorSelected.name !== '') {
      const name =
        connectorSelected.name
          .toLocaleLowerCase()
          .replace(/[^\w-]/g, '')
          .replace(/ /g, '-') + '-aa3f';
      setConnectorName(name);
    }
  }, [connectorSelected]);

  return (
    <>
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
                    'xpack.enterpriseSearch.startStep.euiFormRow.connectorLabel',
                    { defaultMessage: 'Connector' }
                  )}
                >
                  <ChooseConnectorSelectable
                    selfManaged={selfManaged}
                    setConnectorSelected={setConnectorSelected}
                    connectorSelected={connectorSelected}
                    allConnectors={allConnectors}
                    setSelfManaged={setSelfManaged}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={connectorName}
                    onChange={(e) => {
                      if (e.target.value !== connectorName) {
                        setConnectorName(e.target.value);
                      }
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.enterpriseSearch.startStep.euiFormRow.descriptionLabel',
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
                {i18n.translate('xpack.enterpriseSearch.startStep.h4.setUpLabel', {
                  defaultMessage: 'Set up',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.enterpriseSearch.startStep.p.whereDoYouWantLabel', {
                  defaultMessage:
                    'Where do you want to store the connector and how do you want to manage it?',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={elasticManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.startStep.euiRadio.elasticManagedLabel',
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
                    'xpack.enterpriseSearch.startStep.euiRadio.selfManagedLabel',
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
                  {i18n.translate('xpack.enterpriseSearch.startStep.h4.deploymentLabel', {
                    defaultMessage: 'Deployment',
                  })}
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
                  {i18n.translate('xpack.enterpriseSearch.startStep.p.youWillStartTheLabel', {
                    defaultMessage:
                      'You will start the process of creating a new index, API key, and a Web Crawler Connector ID manually. Optionally you can bring your own configuration as well.',
                  })}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                data-test-subj="enterpriseSearchStartStepNextButton"
                onClick={() => setCurrentStep(currentStep + 1)}
                fill
                disabled={connectorSelected.name === '' || connectorName === ''}
              >
                {i18n.translate('xpack.enterpriseSearch.startStep.nextButtonLabel', {
                  defaultMessage: 'Next',
                })}
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
                  {i18n.translate('xpack.enterpriseSearch.startStep.h4.configureIndexAndAPILabel', {
                    defaultMessage: 'Configure index and API key',
                  })}
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
                  {i18n.translate('xpack.enterpriseSearch.startStep.p.thisProcessWillCreateLabel', {
                    defaultMessage:
                      'This process will create a new index, API key, and a Connector ID. Optionally you can bring your own configuration as well.',
                  })}
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
                    {i18n.translate(
                      'xpack.enterpriseSearch.startStep.generateConfigurationButtonLabel',
                      { defaultMessage: 'Continue' }
                    )}
                  </EuiButton>
                </>
              ) : (
                <EuiFlexGroup gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <GenerateConfigButton
                      connectorId={''}
                      generateConfiguration={() => {
                        setNextStepEnabled(true);
                        setTimeout(() => {
                          window.scrollTo({
                            behavior: 'smooth',
                            top: window.innerHeight,
                          });
                        }, 100);
                      }}
                      isGenerateLoading={isGenerateLoading}
                      disabled={connectorSelected.name === '' || connectorName === ''}
                    />
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
    </>
  );
};
