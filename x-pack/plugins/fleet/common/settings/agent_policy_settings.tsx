/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { z } from '@kbn/zod';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../constants';

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
      'https://www.elastic.co/guide/en/fleet/current/agent-policy.html#agent-policy-limit-cpu',
    api_field: {
      name: 'agent_limits_go_max_procs',
    },
    schema: z.number().int().min(0),
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
    schema: zodStringWithDurationValidation,
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
    schema: zodStringWithDurationValidation,
  },
  {
    name: 'agent.logging.level',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelTitle', {
      defaultMessage: 'Agent logging level',
    }),
    description: (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingLevelDescription"
        defaultMessage="Sets the log level for all the agents on the policy. The default log level is {level}."
        values={{ level: <EuiCode>{DEFAULT_LOG_LEVEL}</EuiCode> }}
      />
    ),
    api_field: {
      name: 'agent_logging_level',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/agent-policy.html#agent-policy-log-level',
    schema: z.enum(AGENT_LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
  },
  {
    name: 'agent.logging.to_files',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesTitle', {
      defaultMessage: 'Agent logging to files',
    }),
    description: (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingToFilesDescription"
        defaultMessage="Enables logging to rotating files."
      />
    ),
    api_field: {
      name: 'agent_logging_to_files',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.boolean().default(true),
  },
  {
    name: 'agent.logging.files.rotateeverybytes',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeTitle', {
      defaultMessage: 'Agent logging file size limit',
    }),
    description: (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileSizeDescription"
        defaultMessage="Configure log file size limit in bytes. If limit is reached, log file will be automatically rotated."
      />
    ),
    api_field: {
      name: 'agent_logging_files_rotateeverybytes',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.number().int().min(0),
  },
  {
    name: 'agent.logging.files.keepfiles',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitTitle', {
      defaultMessage: 'Agent logging number of files',
    }),
    description: (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileLimitDescription"
        defaultMessage="Number of rotated log files to keep. Oldest files will be deleted first."
      />
    ),
    api_field: {
      name: 'agent_logging_files_keepfiles',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: z.number().int().min(0),
  },
  {
    name: 'agent.logging.files.interval',
    title: i18n.translate('xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileIntervalitle', {
      defaultMessage: 'Agent logging number of files',
    }),
    description: (
      <FormattedMessage
        id="xpack.fleet.settings.agentPolicyAdvanced.agentLoggingFileIntervalescription"
        defaultMessage="Enable log file rotation on time intervals in addition to size-based rotation, i.e. 24h, 7d."
      />
    ),
    api_field: {
      name: 'agent_logging_files_interval',
    },
    learnMoreLink:
      'https://www.elastic.co/guide/en/fleet/current/elastic-agent-standalone-logging-config.html#elastic-agent-standalone-logging-settings',
    schema: zodStringWithDurationValidation,
  },
];
