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
import { PackagePolicyVars, SettingsRow } from '../typings';
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';

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
                  <EuiLink href={docsLinks} target="_blank">
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
