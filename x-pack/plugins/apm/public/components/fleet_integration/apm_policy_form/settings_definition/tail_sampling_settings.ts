/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { isSettingsFormValid, OPTIONAL_LABEL } from '../settings_form/utils';
import { PackagePolicyVars, SettingsRow } from '../typings';

const TAIL_SAMPLING_ENABLED_KEY = 'tail_sampling_enabled';

export function getTailSamplingSettings(): SettingsRow[] {
  return [
    {
      key: TAIL_SAMPLING_ENABLED_KEY, // change to tail sampling key!!!
      rowTitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingEnabledTitle',
        { defaultMessage: 'Enable tail-based sampling' }
      ),
      rowDescription: i18n.translate(
        'xpack.apm.fleet_integration.settings.tailSampling.enableTailSamplingDescription',
        { defaultMessage: 'Enable tail based sampling.' }
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
                'Interval for syncronisation between multiple APM Servers. Should be in the order of tens of seconds or low minutes.',
            }
          ),
          placeholder: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingIntervalPlaceholder',
            {
              defaultMessage: '1m',
            }
          ),
          labelAppend: OPTIONAL_LABEL,
          required: false,
        },
        {
          key: 'tail_sampling_policies',
          type: 'area',
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
                'Policies map trace events to a sample rate. Each policy must specify a sample rate. Trace events are matched to policies in the order specified. All policy conditions must be true for a trace event to match. Each policy list should conclude with a policy that only specifies a sample rate. This final policy is used to catch remaining trace events that don't match a stricter policy.',
            }
          ),
          placeholder:
            'service.name: string\nservice.environment: string\ntrace.name: string\ntrace.outcome: string\nsample_rate: number',
          labelAppendLink: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingHelpText',
            {
              defaultMessage: 'Learn more',
            }
          ),
          required: true,
          defaultValue: 'sample_rate: 0.1',
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
    !newVars[TAIL_SAMPLING_ENABLED_KEY].value ||
    isSettingsFormValid(tailSamplingSettings, newVars)
  );
}
