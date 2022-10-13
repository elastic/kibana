/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OPTIONAL_LABEL } from '../settings_form/utils';
import { SettingsRow } from '../typings';

export function getAgentAuthorizationSettings(): SettingsRow[] {
  return [
    {
      type: 'boolean',
      key: 'api_key_enabled',
      labelAppend: OPTIONAL_LABEL,
      placeholder: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyAuthenticationPlaceholder',
        { defaultMessage: 'API key for agent authentication' }
      ),
      helpText: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyAuthenticationHelpText',
        {
          defaultMessage:
            'Enable API Key auth between APM Server and APM Agents.',
        }
      ),
      settings: [
        {
          key: 'api_key_limit',
          type: 'integer',
          labelAppend: OPTIONAL_LABEL,
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyLimitLabel',
            { defaultMessage: 'Number of keys' }
          ),
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyLimitHelpText',
            { defaultMessage: 'Might be used for security policy compliance.' }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyLimitTitle',
            {
              defaultMessage:
                'Maximum number of API keys of Agent authentication',
            }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.apiKeyLimitDescription',
            {
              defaultMessage:
                'Restrict number of unique API keys per minute, used for auth between APM Agents and Server.',
            }
          ),
          validation: getIntegerRt({ min: 1 }),
        },
      ],
    },
    {
      type: 'text',
      key: 'secret_token',
      labelAppend: OPTIONAL_LABEL,
      label: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.secretTokenLabel',
        { defaultMessage: 'Secret token' }
      ),
    },
    {
      type: 'boolean',
      key: 'anonymous_enabled',
      rowTitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousEnabledTitle',
        { defaultMessage: 'Anonymous Agent access' }
      ),
      helpText: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousEnabledHelpText',
        {
          defaultMessage:
            'Enable anonymous access to APM Server for select APM Agents.',
        }
      ),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousEnabledDescription',
        {
          defaultMessage:
            'Allow anonymous access only for specified agents and/or services. This is primarily intended to allow limited access for untrusted agents, such as Real User Monitoring. When anonymous auth is enabled, only agents matching the Allowed Agents and services matching the Allowed Services configuration are allowed. See below for details on default values.',
        }
      ),
      settings: [
        {
          type: 'combo',
          key: 'anonymous_allow_agent',
          labelAppend: OPTIONAL_LABEL,
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousAllowAgentLabel',
            { defaultMessage: 'Allowed agents' }
          ),
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousAllowAgentHelpText',
            {
              defaultMessage: 'Allowed agent names for anonymous access.',
            }
          ),
        },
        {
          type: 'combo',
          key: 'anonymous_allow_service',
          labelAppend: OPTIONAL_LABEL,
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousAllowServiceLabel',
            { defaultMessage: 'Allowed services' }
          ),
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousAllowServiceHelpText',
            {
              defaultMessage: 'Allowed service names for anonymous access.',
            }
          ),
        },
        {
          key: 'anonymous_rate_limit_ip_limit',
          type: 'integer',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousRateLimitIpLimitLabel',
            { defaultMessage: 'Rate limit (IP limit)' }
          ),
          labelAppend: OPTIONAL_LABEL,
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousRateLimitIpLimitHelpText',
            {
              defaultMessage:
                'Number of unique client IPs for which a distinct rate limit will be maintained.',
            }
          ),
          validation: getIntegerRt({ min: 1 }),
        },
        {
          key: 'anonymous_rate_limit_event_limit',
          type: 'integer',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousRateLimitEventLimitLabel',
            {
              defaultMessage: 'Event rate limit (event limit)',
            }
          ),
          labelAppend: OPTIONAL_LABEL,
          helpText: i18n.translate(
            'xpack.apm.fleet_integration.settings.agentAuthorization.anonymousRateLimitEventLimitHelpText',
            {
              defaultMessage:
                'Maximum number of events per client IP per second.',
            }
          ),
          validation: getIntegerRt({ min: 1 }),
        },
      ],
    },
  ];
}
