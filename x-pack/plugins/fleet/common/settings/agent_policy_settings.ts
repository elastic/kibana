/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from 'zod';

import { agentLoggingLevels } from '../constants';

import type { SettingsConfig } from './types';

export const zodStringWithDurationValidation = z
  .string()
  .refine((val) => val.match(/^(\d+[s|m|h|d])?$/), {
    message: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutValidationMessage',
      {
        defaultMessage: 'Must be a string with a time unit, e.g. 30s, 5m, 2h, 1d',
      }
    ),
  });

export const AGENT_POLICY_ADVANCED_SETTINGS: SettingsConfig[] = [
  {
    name: 'agent.limits.go_max_procs',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsTitle', {
      defaultMessage: 'Limit CPU usage',
    }),
    description: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.goMaxProcsDescription', {
      defaultMessage: 'Limits the maximum number of CPUs that can be executing simultaneously.',
    }),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/enable-custom-policy-settings.html#limit-cpu-usage',
    api_field: {
      name: 'agent_limits_go_max_procs',
    },
    schema: z.number().int().min(0).default(0),
  },
  {
    name: 'agent.download.timeout',
    hidden: true,
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutTitle', {
      defaultMessage: 'Agent binary download timeout',
    }),
    description: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.downloadTimeoutDescription',
      {
        defaultMessage: 'Timeout for downloading the agent binary.',
      }
    ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/enable-custom-policy-settings.html#configure-agent-download-timeout',
    api_field: {
      name: 'agent_download_timeout',
    },
    schema: zodStringWithDurationValidation.default('2h'),
  },
  {
    name: 'agent.download.target_directory',
    hidden: true,
    api_field: {
      name: 'agent_download_target_directory',
    },
    title: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentDownloadTargetDirectoryTitle',
      {
        defaultMessage: 'Agent binary target directory',
      }
    ),
    description: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentDownloadTargetDirectoryDescription',
      {
        defaultMessage: 'The disk path to which the agent binary will be downloaded.',
      }
    ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-download.html',
    schema: z.string(),
  },
  {
    name: 'agent.logging.metrics.period',
    hidden: true,
    api_field: {
      name: 'agent_logging_metrics_period',
    },
    title: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingMetricsPeriodTitle',
      {
        defaultMessage: 'Agent logging metrics period',
      }
    ),
    description: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingMetricsPeriodDescription',
      {
        defaultMessage: 'The frequency of logging the internal Elastic Agent metrics.',
      }
    ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: zodStringWithDurationValidation.default('30s'),
  },
  {
    name: 'agent.monitoring.http',
    api_field: {
      name: 'agent_monitoring_http',
    },
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentMonitoringHttpTitle', {
      defaultMessage: 'HTTP monitoring endpoint',
    }),
    description: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentMonitoringHttpDescription',
      {
        defaultMessage:
          'Enables a liveness HTTP endpoint that returns the overall health of Elastic Agent. This can be used by Kubernetes to restart the container, for example.',
      }
    ),
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/enable-custom-policy-settings.html#override-default-monitoring-port',
    schema: z
      .object({
        // enabled: z.boolean().describe('Enabled').default(false),
        host: z.string().describe('Host').default('localhost'),
        port: z.number().describe('Port').min(0).max(65353).default(6791),
        // 'buffer.enabled': z.boolean().describe('Buffer Enabled').default(false),
      })
      .default({}),
  },
  {
    name: 'agent.logging.level',
    hidden: true,
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelTitle', {
      defaultMessage: 'Agent logging level',
    }),
    description: i18n.translate(
      'xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelDescription',
      {
        defaultMessage:
          'Sets the log level for all the agents on the policy. The default log level is "info".',
      }
    ),
    api_field: {
      name: 'agent_logging_level',
    },
    schema: z.nativeEnum(agentLoggingLevels).default(agentLoggingLevels.Info),
  },
];
