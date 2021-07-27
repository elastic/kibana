/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OnFormChangeFn, PackagePolicyVars } from '../typings';
import { SettingsForm } from './settings_form';
import { SettingDefinition } from './typings';
import { handleFormChange, isSettingsFormValid, OPTIONAL_LABEL } from './utils';

const advancedSettings: SettingDefinition[] = [
  {
    key: 'rum_event_rate_limit',
    type: 'integer',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLimitLabel',
      { defaultMessage: 'Rate limit events per IP' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLimitHelpText',
      { defaultMessage: 'Maximum number of events allowed per IP per second.' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLimitTitle',
      { defaultMessage: 'Limits' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLimitDescription',
      { defaultMessage: 'Configure authentication for the agent' }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'rum_event_rate_lru_size',
    type: 'integer',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLRUSizeLabel',
      { defaultMessage: 'Rate limit cache size' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumEventRateLRUSizeHelpText',
      {
        defaultMessage:
          'Number of unique IPs to be cached for the rate limiter.',
      }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'rum_library_pattern',
    type: 'text',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumLibraryPatternLabel',
      { defaultMessage: 'Library Frame Pattern' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumLibraryPatternHelpText',
      {
        defaultMessage:
          "Identify library frames by matching a stacktrace frame's file_name and abs_path against this regexp.",
      }
    ),
  },
  {
    key: 'rum_allow_service_names',
    type: 'combo',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowServiceNamesLabel',
      { defaultMessage: 'Allowed service names' }
    ),
    labelAppend: OPTIONAL_LABEL,
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowServiceNamesTitle',
      { defaultMessage: 'Allowed service names' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowServiceNamesDescription',
      { defaultMessage: 'Configure authentication for the agent' }
    ),
  },
];

const basicSettings: SettingDefinition[] = [
  {
    key: 'rum_allow_headers',
    type: 'combo',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderLabel',
      { defaultMessage: 'Allowed origin headers' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderHelpText',
      { defaultMessage: 'Allowed Origin headers to be sent by User Agents.' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderTitle',
      { defaultMessage: 'Custom headers' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowHeaderDescription',
      { defaultMessage: 'Configure authentication for the agent' }
    ),
  },
  {
    key: 'rum_allow_origins',
    type: 'combo',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowOriginsLabel',
      { defaultMessage: 'Access-Control-Allow-Headers' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumAllowOriginsHelpText',
      {
        defaultMessage:
          'Supported Access-Control-Allow-Headers in addition to "Content-Type", "Content-Encoding" and "Accept".',
      }
    ),
  },
  {
    key: 'rum_response_headers',
    type: 'area',
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumResponseHeadersLabel',
      { defaultMessage: 'Custom HTTP response headers' }
    ),
    labelAppend: OPTIONAL_LABEL,
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.rumResponseHeadersHelpText',
      {
        defaultMessage:
          'Added to RUM responses, e.g. for security policy compliance.',
      }
    ),
  },
  {
    key: 'advanced_option',
    type: 'advanced_option',
    settings: advancedSettings,
  },
];

const ENABLE_RUM_KEY = 'enable_rum';
const rumSettings: SettingDefinition[] = [
  {
    key: ENABLE_RUM_KEY,
    type: 'boolean',
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.enableRumTitle',
      { defaultMessage: 'Enable RUM' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.rum.enableRumDescription',
      { defaultMessage: 'Enable Real User Monitoring (RUM)' }
    ),
    settings: basicSettings,
  },
];

const rumFields = [...basicSettings, ...advancedSettings];

function validateRUMForm(vars: PackagePolicyVars) {
  // only validates RUM when its flag is enabled
  return !vars[ENABLE_RUM_KEY].value || isSettingsFormValid(rumFields, vars);
}

interface Props {
  vars: PackagePolicyVars;
  onChange: OnFormChangeFn;
}

export function RUMSettingsForm({ vars, onChange }: Props) {
  return (
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
      onChange={(key, value) => {
        const { newVars, isValid } = handleFormChange({
          vars,
          key,
          value,
          validateForm: validateRUMForm,
        });
        onChange(newVars, isValid);
      }}
    />
  );
}
