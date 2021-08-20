/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  getAnonymousSettings,
  isAnonymousAuthFormValid,
} from './settings/anonymous_auth_settings';
import { getApmSettings, isAPMFormValid } from './settings/apm_settings';
import { getRUMSettings, isRUMFormValid } from './settings/rum_settings';
import { SettingsForm } from './settings/settings_form';
import { getTLSSettings, isTLSFormValid } from './settings/tls_settings';
import { mergeNewVars } from './settings/utils';
import { PackagePolicyVars } from './typings';

interface Props {
  updateAPMPolicy: (newVars: PackagePolicyVars, isValid: boolean) => void;
  vars?: PackagePolicyVars;
  isCloudPolicy: boolean;
}

export function APMPolicyForm({
  vars = {},
  isCloudPolicy,
  updateAPMPolicy,
}: Props) {
  const {
    apmSettings,
    rumSettings,
    anonymousAuthSettings,
    tlsSettings,
  } = useMemo(() => {
    return {
      apmSettings: getApmSettings(isCloudPolicy),
      rumSettings: getRUMSettings(),
      anonymousAuthSettings: getAnonymousSettings(isCloudPolicy),
      tlsSettings: getTLSSettings(),
    };
  }, [isCloudPolicy]);

  function handleFormChange(key: string, value: any) {
    // Merge new key/value with the rest of fields
    const newVars = mergeNewVars(vars, key, value);

    // Validate the entire form before sending it to fleet
    const isFormValid =
      isAPMFormValid(newVars, apmSettings) &&
      isRUMFormValid(newVars, rumSettings) &&
      isTLSFormValid(newVars, tlsSettings) &&
      isAnonymousAuthFormValid(newVars, anonymousAuthSettings);

    updateAPMPolicy(newVars, isFormValid);
  }

  return (
    <>
      {/* APM Settings */}
      <SettingsForm
        title={i18n.translate(
          'xpack.apm.fleet_integration.settings.apm.settings.title',
          { defaultMessage: 'General' }
        )}
        subtitle={i18n.translate(
          'xpack.apm.fleet_integration.settings.apm.settings.subtitle',
          { defaultMessage: 'Settings for the APM integration.' }
        )}
        settings={apmSettings}
        vars={vars}
        onChange={handleFormChange}
      />
      <EuiSpacer />

      {/* RUM Settings */}
      <SettingsForm
        title={i18n.translate(
          'xpack.apm.fleet_integration.settings.rum.settings.title',
          { defaultMessage: 'Real User Monitoring' }
        )}
        subtitle={i18n.translate(
          'xpack.apm.fleet_integration.settings.rum.settings.subtitle',
          { defaultMessage: 'Manage the configuration of the RUM JS agent.' }
        )}
        settings={rumSettings}
        vars={vars}
        onChange={handleFormChange}
      />
      <EuiSpacer />

      {/* TLS Settings */}
      <SettingsForm
        title={i18n.translate(
          'xpack.apm.fleet_integration.settings.tls.settings.title',
          { defaultMessage: 'TLS Settings' }
        )}
        subtitle={i18n.translate(
          'xpack.apm.fleet_integration.settings.tls.settings.subtitle',
          { defaultMessage: 'Settings for TLS certification.' }
        )}
        settings={tlsSettings}
        vars={vars}
        onChange={handleFormChange}
      />
      <EuiSpacer />

      {/* Anonymous auth Settings */}
      <SettingsForm
        title={i18n.translate(
          'xpack.apm.fleet_integration.settings.anonymousAuth.settings.title',
          { defaultMessage: 'Anonymous auth' }
        )}
        settings={anonymousAuthSettings}
        vars={vars}
        onChange={handleFormChange}
      />
    </>
  );
}
