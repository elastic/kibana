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
                'Events are matched in the exact order of how policies are specified. Every policy needs to specify a sample rate. A trace needs to match all policy constraints to match a policy. Specify one policy at the end of the list with only a sample rate. This policy is applied to all traces that do not match a more fine grained policy.',
            }
          ),
          placeholder:
            '- service.name: string\n         service.environment: string\n         trace.name: string\n         trace.outcome: string\n         sample_rate: number',
          labelAppendLink: i18n.translate(
            'xpack.apm.fleet_integration.settings.tailSampling.tailSamplingHelpText',
            {
              defaultMessage: 'Learn more',
            }
          ),
          // required: true,
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
