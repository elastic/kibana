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
import { isValidIndexName } from '../../../utils/validate_index_name';
import { GeneratedConfigFields } from '../../connector_detail/components/generated_config_fields';

import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
import { NewConnectorLogic } from '../../new_index/method_connector/new_connector_logic';

import { ChooseConnectorSelectable } from './components/choose_connector_selectable';
import { ConnectorDescriptionPopover } from './components/connector_description_popover';
import { ManualConfiguration } from './components/manual_configuration';
import { SelfManagePreference } from './create_connector';

interface StartStepProps {
  error?: string | React.ReactNode;
  isRunningLocally: boolean;
  onSelfManagePreferenceChange(preference: SelfManagePreference): void;
  selfManagePreference: SelfManagePreference;
  setCurrentStep: Function;
  title: string;
}

export const StartStep: React.FC<StartStepProps> = ({
  title,
  isRunningLocally,
  selfManagePreference,
  setCurrentStep,
  onSelfManagePreferenceChange,
  error,
}) => {
  const elasticManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'elasticManagedRadioButton' });
  const selfManagedRadioButtonId = useGeneratedHtmlId({ prefix: 'selfManagedRadioButton' });

  const {
    rawName,
    canConfigureConnector,
    selectedConnector,
    generatedConfigData,
    isGenerateLoading,
    isCreateLoading,
  } = useValues(NewConnectorLogic);
  const { setRawName, createConnector, generateConnectorName, setFormDirty } =
    useActions(NewConnectorLogic);
  const { connector } = useValues(ConnectorViewLogic);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
  };

  const formError = isValidIndexName(rawName)
    ? error
    : i18n.translate(
        'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.nameInputHelpText.lineOne',
        {
          defaultMessage: '{connectorName} is an invalid index name',
          values: {
            connectorName: rawName,
          },
        }
      );

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
                  isInvalid={!!error}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.connectorNameLabel',
                    { defaultMessage: 'Connector name' }
                  )}
                  helpText={
                    <>
                      <EuiText size="xs" grow={false} color="danger">
                        {formError}
                      </EuiText>
                      <EuiText size="xs" grow={false}>
                        {i18n.translate(
                          'xpack.enterpriseSearch.startStep.namesShouldBeLowercaseTextLabel',
                          {
                            defaultMessage:
                              'The connector name should be lowercase and cannot contain spaces or special characters.',
                          }
                        )}
                      </EuiText>
                    </>
                  }
                >
                  <EuiFieldText
                    data-test-subj="enterpriseSearchStartStepFieldText"
                    fullWidth
                    name="first"
                    value={rawName}
                    onChange={handleNameChange}
                    disabled={!!connector}
                    onBlur={() => {
                      if (selectedConnector) {
                        generateConnectorName({
                          connectorName: rawName,
                          connectorType: selectedConnector.serviceType,
                        });
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
                  'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.descriptionLabel',
                  { defaultMessage: 'Description' }
                )}
                labelAppend={
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.enterpriseSearch.createConnector.startStep.euiFormRow.descriptionLabelAppend',
                      { defaultMessage: 'Optional' }
                    )}
                  </EuiText>
                }
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
                  defaultMessage: 'Setup',
                })}
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.createConnector.startStep.p.whereDoYouWantLabel',
                  {
                    defaultMessage: 'Choose how to deploy and manage your connector:',
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
                  disabled={selectedConnector?.isNative === false || isRunningLocally}
                  onChange={() => onSelfManagePreferenceChange('native')}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover
                  showIsOnlySelfManaged={selectedConnector?.isNative === false}
                  isRunningLocally={isRunningLocally}
                  isNative
                />
              </EuiFlexItem>
              &nbsp; &nbsp;
              <EuiFlexItem grow={false}>
                <EuiRadio
                  id={selfManagedRadioButtonId}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.euiRadio.selfManagedLabel',
                    { defaultMessage: 'Self-managed' }
                  )}
                  checked={selfManagePreference === 'selfManaged'}
                  onChange={() => onSelfManagePreferenceChange('selfManaged')}
                  name="setUp"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConnectorDescriptionPopover showIsOnlySelfManaged={false} isNative={false} />
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
              color={
                selectedConnector?.name && isValidIndexName(rawName) && !error ? 'plain' : 'subdued'
              }
            >
              <EuiText
                color={
                  selectedConnector?.name && isValidIndexName(rawName) && !error
                    ? 'default'
                    : 'subdued'
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
                color={selectedConnector?.name && isValidIndexName(rawName) ? 'default' : 'subdued'}
                size="s"
              >
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.createConnector.startStep.p.youWillStartTheLabel',
                    {
                      defaultMessage:
                        "We'll automatically configure your index, API key, and connector ID. Alternatively, create these manually and use a custom configuration.",
                    }
                  )}
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                data-test-subj="enterpriseSearchStartStepNextButton"
                onClick={() => {
                  if (selectedConnector && selectedConnector.name) {
                    createConnector({
                      isSelfManaged: true,
                    });
                    setFormDirty(true);
                    setCurrentStep('deployment');
                  }
                }}
                fill
                disabled={!canConfigureConnector || !isValidIndexName(rawName) || Boolean(error)}
                isLoading={isCreateLoading || isGenerateLoading}
              >
                {Constants.NEXT_BUTTON_LABEL}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
        ) : (
          <EuiFlexItem>
            <EuiPanel
              color={
                selectedConnector?.name && isValidIndexName(rawName) && !error ? 'plain' : 'subdued'
              }
              hasShadow={false}
              hasBorder
              paddingSize="l"
            >
              <EuiText
                color={
                  selectedConnector?.name && isValidIndexName(rawName) && !error
                    ? 'default'
                    : 'subdued'
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
                  selectedConnector?.name && isValidIndexName(rawName) && !error
                    ? 'default'
                    : 'subdued'
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
              {generatedConfigData && connector ? (
                <>
                  <GeneratedConfigFields
                    apiKey={{
                      api_key: generatedConfigData.apiKey.api_key,
                      encoded: generatedConfigData.apiKey.encoded,
                      id: generatedConfigData.apiKey.id,
                      name: generatedConfigData.apiKey.name,
                    }}
                    connector={connector}
                    isGenerateLoading={false}
                  />
                  <EuiSpacer size="m" />
                  <EuiButton
                    data-test-subj="enterpriseSearchStartStepGenerateConfigurationButton"
                    fill
                    onClick={() => {
                      setCurrentStep('configure');
                    }}
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
                      disabled={
                        !canConfigureConnector || !isValidIndexName(rawName) || Boolean(error)
                      }
                      fill
                      iconType="sparkles"
                      isLoading={isGenerateLoading || isCreateLoading}
                      onClick={() => {
                        setFormDirty(true);
                        createConnector({
                          isSelfManaged: false,
                        });
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
                      isDisabled={
                        isGenerateLoading ||
                        isCreateLoading ||
                        !canConfigureConnector ||
                        !isValidIndexName(rawName) ||
                        Boolean(error)
                      }
                      selfManagePreference={selfManagePreference}
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
