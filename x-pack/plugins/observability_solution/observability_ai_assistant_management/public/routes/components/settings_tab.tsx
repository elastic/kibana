/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAppContext } from '../../hooks/use_app_context';

export function SettingsTab() {
  const {
    application: { navigateToApp },
    observabilityAIAssistant,
  } = useAppContext();

  // If the AI Assistant is not available, don't render the settings tab
  if (!observabilityAIAssistant) {
    return null;
  }

  const {
    connectors = [],
    selectedConnector,
    selectConnector,
  } = observabilityAIAssistant.useGenAIConnectors();

  const selectorOptions = connectors.map((connector) => ({
    text: connector.name,
    value: connector.id,
  }));

  const handleNavigateToConnectors = () => {
    navigateToApp('management', {
      path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
    });
  };

  const handleNavigateToSpacesConfiguration = () => {
    navigateToApp('management', {
      path: '/kibana/spaces',
    });
  };

  const { selectedLanguage, setSelectedLanguage, LANGUAGE_OPTIONS } =
    observabilityAIAssistant.useUserPreferredLanguage();

  return (
    <>
      <EuiPanel hasBorder grow={false}>
        <EuiForm component="form">
          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.showAIAssistantButtonLabel',
                  {
                    defaultMessage:
                      'Show AI Assistant button and Contextual Insights in Observability apps',
                  }
                )}
              </h3>
            }
            description={
              <p>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.showAIAssistantDescriptionLabel',
                  {
                    defaultMessage:
                      'Toggle the AI Assistant button and Contextual Insights on or off in Observability apps by checking or unchecking the AI Assistant feature in Spaces > <your space> > Features.',
                  }
                )}
              </p>
            }
          >
            <EuiFormRow fullWidth>
              <div css={{ textAlign: 'right' }}>
                <EuiButton
                  data-test-subj="settingsTabGoToSpacesButton"
                  onClick={handleNavigateToSpacesConfiguration}
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.settingsPage.goToFeatureControlsButtonLabel',
                    { defaultMessage: 'Go to Spaces' }
                  )}
                </EuiButton>
              </div>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiPanel hasBorder grow={false}>
        <EuiForm component="form">
          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.connectorSettingsLabel',
                  {
                    defaultMessage: 'Connector settings',
                  }
                )}
              </h3>
            }
            description={i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.euiDescribedFormGroup.inOrderToUseLabel',
              {
                defaultMessage:
                  'In order to use the Observability AI Assistant you must set up a Generative AI connector.',
              }
            )}
          >
            <EuiFormRow fullWidth>
              <div css={{ textAlign: 'right' }}>
                <EuiButton
                  data-test-subj="settingsTabGoToConnectorsButton"
                  onClick={handleNavigateToConnectors}
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.settingsPage.goToConnectorsButtonLabel',
                    {
                      defaultMessage: 'Manage connectors',
                    }
                  )}
                </EuiButton>
              </div>
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.h4.selectDefaultConnectorLabel',
                  { defaultMessage: 'Default connector' }
                )}
              </h3>
            }
            description={i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.connectYourElasticAITextLabel',
              {
                defaultMessage:
                  'Select the Generative AI connector you want to use as the default for the Observability AI Assistant.',
              }
            )}
          >
            <EuiFormRow
              style={{ alignSelf: 'end', width: '80%' }}
              fullWidth
              label={i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.selectConnectorLabel',
                {
                  defaultMessage: 'Select connector',
                }
              )}
            >
              <EuiSelect
                data-test-subj="settingsTabGenAIConnectorSelect"
                id="generativeAIProvider"
                options={selectorOptions}
                value={selectedConnector}
                onChange={(e) => {
                  selectConnector(e.target.value);
                }}
                aria-label={i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.euiSelect.generativeAIProviderLabel',
                  { defaultMessage: 'Generative AI provider' }
                )}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiPanel hasBorder grow={false}>
        <EuiForm component="form">
          <EuiDescribedFormGroup
            fullWidth
            title={
              <h3>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.userPreferencesLabel',
                  {
                    defaultMessage: 'User preferences',
                  }
                )}
              </h3>
            }
            description={i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.selectYourLanguageLabel',
              {
                defaultMessage:
                  'Select the language you wish the Assistant to use when generating responses.',
              }
            )}
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.selectLanguageLabel',
                {
                  defaultMessage: 'Response language',
                }
              )}
            >
              <EuiComboBox
                data-test-subj="settingsTabUserPreferredLanguage"
                singleSelection={{ asPlainText: true }}
                isClearable={false}
                options={LANGUAGE_OPTIONS}
                selectedOptions={selectedLanguage ? [{ label: selectedLanguage }] : []}
                onChange={(selected) => {
                  setSelectedLanguage(selected[0]?.label ?? '');
                }}
                aria-label={i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.userPreferences.responseLanguageLabel',
                  { defaultMessage: 'Response language' }
                )}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>
      </EuiPanel>
    </>
  );
}
