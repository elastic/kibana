/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isSettingsFormValid, OPTIONAL_LABEL } from '../settings_form/utils';
import type { PackagePolicyVars, SettingsRow } from '../typings';
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { getStorageSizeRt } from '../../../../../common/agent_configuration/runtime_types/storage_size_rt';

export const TAIL_SAMPLING_ENABLED_KEY = 'tail_sampling_enabled';

export function getTailSamplingSettings(docsLinks?: string): SettingsRow[] {
  return [
    {
      key: TAIL_SAMPLING_ENABLED_KEY,
      rowTitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingEnabledTitle',
        { defaultMessage: 'Enable tail-based sampling' }
      ),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.tailSampling.enableTailSamplingDescription',
        { defaultMessage: 'Enable tail-based sampling.' }
      ),
      type: 'boolean',
      settings: [
        {
          key: 'tail_sampling_interval',
          type: 'duration',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingInterval',
            {
              defaultMessage: 'Tail sampling interval',
            }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingIntervalTitle',
            { defaultMessage: 'Interval' }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingIntervalDescription',
            {
              defaultMessage:
                'Interval for synchronization between multiple APM Servers. Should be in the order of tens of seconds or low minutes.',
            }
          ),
          labelAppend: OPTIONAL_LABEL,
          required: false,
          validation: getDurationRt({ min: '1s' }),
        },
        {
          key: 'tail_sampling_policies',
          type: 'yaml',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingPolicies',
            { defaultMessage: 'Tail sampling policies' }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingPoliciesTitle',
            { defaultMessage: 'Policies' }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingPoliciesDescription',
            {
              defaultMessage:
                'Policies map trace events to a sample rate. Each policy must specify a sample rate. Trace events are matched to policies in the order specified. All policy conditions must be true for a trace event to match. Each policy list should conclude with a policy that only specifies a sample rate. This final policy is used to catch remaining trace events that don’t match a stricter policy.',
            }
          ),
          helpText: docsLinks && (
            <FormattedMessage
              id="xpack.apm.fleet_integration.settings.tailSamplingDocsHelpText"
              defaultMessage="Learn more about tail sampling policies in our {link}."
              values={{
                link: (
                  <EuiLink
                    data-test-subj="apmGetTailSamplingSettingsDocsLink"
                    href={docsLinks}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.apm.fleet_integration.settings.tailSamplingDocsHelpTextLink',
                      {
                        defaultMessage: 'docs',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          ),
          required: true,
        },
        {
          key: 'tail_sampling_storage_limit',
          type: 'storageSize',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingStorageLimit',
            {
              defaultMessage: 'Tail sampling storage limit',
            }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingStorageLimitTitle',
            { defaultMessage: 'Storage limit' }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingStorageLimitDescription',
            {
              defaultMessage:
                'The amount of storage space allocated for trace events matching tail sampling policies. Caution: Setting this limit higher than the allowed space may cause APM Server to become unhealthy.',
            }
          ),
          labelAppend: OPTIONAL_LABEL,
          required: false,
          validation: getStorageSizeRt({ min: '0GB' }),
        },
        {
          key: 'tail_sampling_ttl',
          type: 'duration',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingTTL',
            {
              defaultMessage: 'Tail sampling TTL (Time-to-live)',
            }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingTTLTitle',
            { defaultMessage: 'TTL (Time-to-live)' }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingTTLDescription',
            {
              defaultMessage:
                'Time-to-live (TTL) for trace events stored in the local storage of the APM Server during tail-based sampling. This TTL determines how long trace events are retained in the local storage while waiting for a sampling decision to be made. A greater TTL value increases storage space requirements. Should be at least 2 * Interval.',
            }
          ),
          labelAppend: OPTIONAL_LABEL,
          required: false,
          validation: getDurationRt({ min: '1s' }),
        },
        {
          key: 'tail_sampling_discard_on_write_failure',
          type: 'boolean',
          label: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingDiscardOnWriteFailure',
            {
              defaultMessage: 'Tail sampling discard on write failure',
            }
          ),
          rowTitle: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingDiscardOnWriteFailureTitle',
            { defaultMessage: 'Discard on write failure' }
          ),
          rowDescription: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingDiscardOnWriteFailureDescription',
            {
              defaultMessage:
                'Defines the indexing behavior when trace events fail to be written to storage (for example, when the storage limit is reached). When set to `false`, traces bypass sampling and are always indexed, which significantly increases the indexing load. When set to `true`, traces are discarded, causing data loss which can result in broken traces.',
            }
          ),
          required: false,
        },
      ],
    },
  ];
}

export function isTailBasedSamplingValid(
  newVars: PackagePolicyVars,
  tailSamplingSettings: SettingsRow[]
) {
  // only validates TBS when its flag is enabled
  return (
    !newVars[TAIL_SAMPLING_ENABLED_KEY].value || isSettingsFormValid(tailSamplingSettings, newVars)
  );
}
