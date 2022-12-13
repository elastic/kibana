/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { LazyField } from '@kbn/advanced-settings-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  apmLabsButton,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  defaultApmServiceEnvironment,
  enableComparisonByDefault,
  enableInspectEsQueries,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
} from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmEditableSettings } from '../../../../hooks/use_apm_editable_settings';
import { BottomBarActions } from '../bottom_bar_actions';

const apmSettingsKeys = [
  enableComparisonByDefault,
  defaultApmServiceEnvironment,
  apmProgressiveLoading,
  apmServiceGroupMaxNumberOfServices,
  enableInspectEsQueries,
  apmLabsButton,
  apmAWSLambdaPriceFactor,
  apmAWSLambdaRequestCostPerMillion,
];

export function GeneralSettings() {
  const { docLinks, notifications, application } = useApmPluginContext().core;
  const {
    handleFieldChange,
    settingsEditableConfig,
    unsavedChanges,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
  } = useApmEditableSettings(apmSettingsKeys);

  async function handleSave() {
    try {
      const reloadPage = Object.keys(unsavedChanges).some((key) => {
        return settingsEditableConfig[key].requiresPageReload;
      });
      await saveAll({ trackMetricName: 'general_settings_save' });
      if (reloadPage) {
        window.location.reload();
      }
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.apm.apmSettings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.apm.apmSettings.callOutTitle', {
          defaultMessage: 'Looking for all settings?',
        })}
        iconType="search"
      >
        <p>
          <FormattedMessage
            id="xpack.apm.apmSettings.kibanaLink"
            defaultMessage="The full list of APM options can be found in {link}"
            values={{
              link: (
                <EuiLink
                  href={application.getUrlForApp('management', {
                    path: `/kibana/settings?query=category:(observability)`,
                  })}
                >
                  {i18n.translate('xpack.apm.apmSettings.kibanaLink.label', {
                    defaultMessage: 'Kibana advanced settings.',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer />
      {apmSettingsKeys.map((settingKey) => {
        const editableConfig = settingsEditableConfig[settingKey];
        return (
          <LazyField
            key={settingKey}
            setting={editableConfig}
            handleChange={handleFieldChange}
            enableSaving
            docLinks={docLinks.links}
            toasts={notifications.toasts}
            unsavedChanges={unsavedChanges[settingKey]}
          />
        );
      })}
      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={cleanUnsavedChanges}
          onSave={handleSave}
          saveLabel={i18n.translate('xpack.apm.apmSettings.saveButton', {
            defaultMessage: 'Save changes',
          })}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
        />
      )}
    </>
  );
}
