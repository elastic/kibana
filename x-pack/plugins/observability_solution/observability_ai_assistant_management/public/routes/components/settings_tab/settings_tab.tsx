/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiDescribedFormGroup, EuiFormRow, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAppContext } from '../../../hooks/use_app_context';
import { PersistedSettings } from './persisted_settings';

export function SettingsTab() {
  const {
    application: { navigateToApp },
    http,
  } = useAppContext();

  const handleNavigateToSpacesConfiguration = () => {
    navigateToApp('management', {
      path: '/kibana/spaces',
    });
  };

  return (
    <EuiPanel hasBorder grow={false}>
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
          <EuiButton
            data-test-subj="settingsTabGoToSpacesButton"
            onClick={handleNavigateToSpacesConfiguration}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.goToFeatureControlsButtonLabel',
              { defaultMessage: 'Go to Spaces' }
            )}
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>

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
          <EuiButton
            data-test-subj="settingsTabGoToConnectorsButton"
            href={http.basePath.prepend(
              `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
            )}
          >
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.goToConnectorsButtonLabel',
              {
                defaultMessage: 'Manage connectors',
              }
            )}
          </EuiButton>
        </EuiFormRow>
      </EuiDescribedFormGroup>

      <PersistedSettings />
    </EuiPanel>
  );
}
