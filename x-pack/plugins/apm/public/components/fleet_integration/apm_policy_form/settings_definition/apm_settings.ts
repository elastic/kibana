/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OPTIONAL_LABEL, REQUIRED_LABEL } from '../settings_form/utils';
import { SettingsRow } from '../typings';

export function getApmSettings(): SettingsRow[] {
  return [
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
            'Host defines the host and port the server is listening on. URL is the unchangeable, publicly reachable server URL for deployments on Elastic Cloud or ECK.',
        }
      ),
      dataTestSubj: 'packagePolicyHostInput',
      required: true,
    },
    {
      type: 'text',
      key: 'url',
      labelAppend: REQUIRED_LABEL,
      label: i18n.translate(
        'xpack.apm.fleet_integration.settings.apm.urlLabel',
        {
          defaultMessage: 'URL',
        }
      ),
      dataTestSubj: 'packagePolicyUrlInput',
      required: true,
    },
    {
      type: 'advanced_setting',
      settings: [
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
          type: 'duration',
          labelAppend: OPTIONAL_LABEL,
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.apm.idleTimeoutLabel',
            {
              defaultMessage:
                'Idle time before underlying connection is closed',
            }
          ),
          validation: getDurationRt({ min: '1ms' }),
        },
        {
          key: 'read_timeout',
          type: 'duration',
          labelAppend: OPTIONAL_LABEL,
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.apm.readTimeoutLabel',
            { defaultMessage: 'Maximum duration for reading an entire request' }
          ),
          validation: getDurationRt({ min: '1ms' }),
        },
        {
          key: 'shutdown_timeout',
          type: 'duration',
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
          type: 'duration',
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
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.apm.maxConnectionsHelpText',
            { defaultMessage: '0 for unlimited' }
          ),
          validation: getIntegerRt({ min: 0 }),
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
            { defaultMessage: 'Custom HTTP headers added to HTTP responses' }
          ),
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
      ],
    },
  ];
}
