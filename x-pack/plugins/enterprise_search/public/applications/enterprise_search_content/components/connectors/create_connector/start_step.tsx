/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

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

import * as Constants from '../../../../shared/constants';
import { GeneratedConfigFields } from '../../connector_detail/components/generated_config_fields';
import { DeploymentLogic } from '../../connector_detail/deployment_logic';

import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';
import { ManualConfiguration } from './components/manual_configuration';
import { SelfManagePreference } from './create_connector';
import { UNIVERSAL_LANGUAGE_VALUE } from '../../new_index/constants';

interface StartStepProps {
  currentStep: number;
  error?: string | React.ReactNode;
  isNextStepEnabled: boolean;
  onNameChange?(name: string): void;
  onSelfManagePreferenceChange(preference: SelfManagePreference): void;
  onSubmit(name: string): void;
  selfManagePreference: SelfManagePreference;
  setCurrentStep: Function;
  setNextStepEnabled: Function;
  title: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  title,
  selfManagePreference,
  currentStep,
  setCurrentStep,
  isNextStepEnabled,
  setNextStepEnabled,
  onNameChange,
  onSelfManagePreferenceChange,
  onSubmit,
  error,
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });
  const { isGenerateLoading } = useValues(DeploymentLogic);

  const {
    fullIndexName,
    fullIndexNameExists,
    fullIndexNameIsValid,
    canConfigureConnector,
    selectedConnector,
    generatedConfigData,
  } = useValues(NewConnectorLogic);
  const { setRawName, createConnector } = useActions(NewConnectorLogic);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
    if (onNameChange) {
      onNameChange(fullIndexName);
    }
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

  return (
    <EuiForm component="form" id="enterprise-search-create-connector">
      <EuiFlexGroup gutterSize="m" direction="column">
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
                  <ChooseConnectorSelectable selfManaged={selfManagePreference} />
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
                  checked={selfManagePreference === 'native'}
                  disabled={selectedConnector?.isNative === false}
                  onChange={() => onSelfManagePreferenceChange('native')}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover
                  isDisabled={selectedConnector?.isNative === false}
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
                  checked={selfManagePreference === 'selfManaged'}
                  onChange={() => onSelfManagePreferenceChange('selfManaged')}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover isDisabled={false} isNative={false} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {selfManagePreference === 'selfManaged' ? (
          <EuiFlexItem>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="l"
              color={selectedConnector?.name ? 'plain' : 'subdued'}
            >
              <EuiText color={selectedConnector?.name ? 'default' : 'subdued'}>
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
              <EuiText color={selectedConnector?.name ? 'default' : 'subdued'} size="s">
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
                disabled={canConfigureConnector}
              >
                {Constants.NEXT_BUTTON_LABEL}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiPanel
              color={selectedConnector?.name ? 'plain' : 'subdued'}
              hasShadow={false}
              hasBorder
              paddingSize="l"
            >
              <EuiText color={selectedConnector?.name ? 'default' : 'subdued'}>
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
              <EuiText color={selectedConnector?.name ? 'default' : 'subdued'} size="s">
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
              {generatedConfigData ? (
                <>
                  <GeneratedConfigFields
                    apiKey={{
                      api_key: generatedConfigData.apiKey.api_key,
                      encoded: generatedConfigData.apiKey.encoded,
                      id: generatedConfigData.apiKey.id,
                      name: generatedConfigData.apiKey.name,
                    }}
                    generateApiKey={() => {}} // TODO: bind
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
                      disabled={!canConfigureConnector}
                      fill
                      iconType="sparkles"
                      isLoading={isGenerateLoading}
                      onClick={() => {
                        // when it is successfull then set next step enabled in the logic file
                        // and show response component
                        createConnector({
                          isSelfManaged: false,
                        });

                        // setTimeout(() => { // TODO: Move this to a function and call it
                        //  window.scrollTo({
                        //    behavior: 'smooth',
                        //    top: window.innerHeight,
                        //  });
                        // }, 100);
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
                      isDisabled={!canConfigureConnector}
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
