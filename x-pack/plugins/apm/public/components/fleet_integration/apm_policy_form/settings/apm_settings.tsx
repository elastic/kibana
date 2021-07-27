/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OnFormChangeFn, PackagePolicyVars } from '../typings';
import { SettingsForm } from './settings_form';
import { SettingDefinition } from './typings';
import {
  handleFormChange,
  isSettingsFormValid,
  OPTIONAL_LABEL,
  REQUIRED_LABEL,
} from './utils';

const basicSettings: SettingDefinition[] = [
  {
    type: 'text',
    key: 'host',
    labelAppend: REQUIRED_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.hostLabel',
      { defaultMessage: 'Host' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.hostTitle',
      { defaultMessage: 'Server configuration' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.hostDescription',
      {
        defaultMessage:
          'Choose a name and description to help identify how this integration will be used.',
      }
    ),

    required: true,
  },
  {
    type: 'text',
    key: 'url',
    labelAppend: REQUIRED_LABEL,
    label: i18n.translate('xpack.apm.fleet_integration.settings.apm.urlLabel', {
      defaultMessage: 'URL',
    }),
    required: true,
  },
  {
    type: 'text',
    key: 'secret_token',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.secretTokenLabel',
      { defaultMessage: 'Secret token' }
    ),
  },
  {
    type: 'boolean',
    key: 'api_key_enabled',
    labelAppend: OPTIONAL_LABEL,
    placeholder: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyAuthenticationPlaceholder',
      { defaultMessage: 'API key for agent authentication' }
    ),
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyAuthenticationHelpText',
      {
        defaultMessage:
          'Enable API Key auth between APM Server and APM Agents.',
      }
    ),
  },
];

const advancedSettings: SettingDefinition[] = [
  {
    key: 'max_header_bytes',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.maxHeaderBytesLabel',
      { defaultMessage: "Maximum size of a request's header (bytes)" }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.maxHeaderBytesTitle',
      { defaultMessage: 'Limits' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.maxHeaderBytesDescription',
      {
        defaultMessage:
          'Set limits on request headers sizes and timing configurations.',
      }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'idle_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.idleTimeoutLabel',
      { defaultMessage: 'Idle time before underlying connection is closed' }
    ),
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'read_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.readTimeoutLabel',
      { defaultMessage: 'Maximum duration for reading an entire request' }
    ),
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'shutdown_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.shutdownTimeoutLabel',
      {
        defaultMessage:
          'Maximum duration before releasing resources when shutting down',
      }
    ),
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'write_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.writeTimeoutLabel',
      { defaultMessage: 'Maximum duration for writing a response' }
    ),
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'max_event_bytes',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.maxEventBytesLabel',
      { defaultMessage: 'Maximum size per event (bytes)' }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'max_connections',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.maxConnectionsLabel',
      { defaultMessage: 'Simultaneously accepted connections' }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'response_headers',
    type: 'area',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.responseHeadersLabel',
      { defaultMessage: 'Custom HTTP headers added to HTTP responses' }
    ),
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.responseHeadersHelpText',
      { defaultMessage: 'Might be used for security policy compliance.' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.responseHeadersTitle',
      { defaultMessage: 'Custom headers' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.responseHeadersDescription',
      {
        defaultMessage:
          'Set limits on request headers sizes and timing configurations.',
      }
    ),
  },
  {
    key: 'api_key_limit',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyLimitLabel',
      { defaultMessage: 'Number of keys' }
    ),
    helpText: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyLimitHelpText',
      { defaultMessage: 'Might be used for security policy compliance.' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyLimitTitle',
      { defaultMessage: 'Maximum number of API keys of Agent authentication' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.apiKeyLimitDescription',
      {
        defaultMessage:
          'Restrict number of unique API keys per minute, used for auth between aPM Agents and Server.',
      }
    ),
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'capture_personal_data',
    type: 'boolean',
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.capturePersonalDataTitle',
      { defaultMessage: 'Capture personal data' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.capturePersonalDataDescription',
      { defaultMessage: 'Capture personal data such as IP or User Agent' }
    ),
  },
  {
    key: 'default_service_environment',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.defaultServiceEnvironmentLabel',
      { defaultMessage: 'Default Service Environment' }
    ),
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.defaultServiceEnvironmentTitle',
      { defaultMessage: 'Service configuration' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.defaultServiceEnvironmentDescription',
      {
        defaultMessage:
          'Default service environment to record in events which have no service environment defined.',
      }
    ),
  },
  {
    key: 'expvar_enabled',
    type: 'boolean',
    labelAppend: OPTIONAL_LABEL,
    rowTitle: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.expvarEnabledTitle',
      { defaultMessage: 'Enable APM Server Golang expvar support' }
    ),
    rowDescription: i18n.translate(
      'xpack.apm.fleet_integration.settings.apm.expvarEnabledDescription',
      { defaultMessage: 'Exposed under /debug/vars' }
    ),
  },
];

const apmFields = [...basicSettings, ...advancedSettings];
function validateAPMForm(vars: PackagePolicyVars) {
  return isSettingsFormValid(apmFields, vars);
}

const advancedOptionsSettings: SettingDefinition = {
  key: 'advanced_option',
  type: 'advanced_option',
  settings: advancedSettings,
};
const apmSettings = [...basicSettings, advancedOptionsSettings];

interface Props {
  vars: PackagePolicyVars;
  onChange: OnFormChangeFn;
}
export function APMSettingsForm({ vars, onChange }: Props) {
  return (
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
      onChange={(key, value) => {
        const { newVars, isValid } = handleFormChange({
          vars,
          key,
          value,
          validateForm: validateAPMForm,
        });
        onChange(newVars, isValid);
      }}
    />
  );
}
