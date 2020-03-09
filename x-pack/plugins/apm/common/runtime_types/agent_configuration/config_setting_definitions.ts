/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Type } from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { transactionSampleRateRt } from './transaction_sample_rate_rt';
import { transactionMaxSpansRt } from './transaction_max_spans_rt';
import { captureBodyRt } from './capture_body_rt';

interface BaseSetting {
  key: string;
  label: string;
  defaultValue: string;
  helpText: string;
  placeholder: string;
  validation: Type<any, any, unknown>;
}

interface TextSetting extends BaseSetting {
  type: 'text';
  validationError: string;
}

interface NumberSetting extends BaseSetting {
  type: 'number';
  min: number;
  max: number;
  validationError: string;
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string }>;
}

export type SettingDefinition = TextSetting | NumberSetting | SelectSetting;

/*
 * Settings added here will automatically be added to  `agent_configuration/agent_configuration_intake_rt.ts`
 * and validated bothj client and server-side
 */
export const settingDefinitions: SettingDefinition[] = [
  // Transaction sample rate
  {
    key: 'transaction_sample_rate',
    validation: transactionSampleRateRt,
    type: 'text',
    defaultValue: '1.0',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.sampleRateConfigurationInputLabel',
      { defaultMessage: 'Transaction sample rate' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.sampleRateConfigurationInputHelpText',
      {
        defaultMessage:
          'Choose a rate between 0.000 and 1.0. Default is 1.0 (100% of traces).'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.sampleRateConfigurationInputPlaceholderText',
      { defaultMessage: 'Set sample rate' }
    ),
    validationError: i18n.translate(
      'xpack.apm.settings.agentConf.sampleRateConfigurationInputErrorText',
      { defaultMessage: 'Sample rate must be between 0.000 and 1' }
    )
  },

  // Capture body
  {
    key: 'capture_body',
    validation: captureBodyRt,
    type: 'select',
    defaultValue: 'off',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.captureBodyInputLabel',
      { defaultMessage: 'Capture body' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.captureBodyInputHelpText',
      {
        defaultMessage:
          'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "off".'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.captureBodyInputPlaceholderText',
      { defaultMessage: 'Select option' }
    ),
    options: [
      { text: 'off' },
      { text: 'errors' },
      { text: 'transactions' },
      { text: 'all' }
    ]
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    validation: transactionMaxSpansRt,
    type: 'number',
    defaultValue: '500',
    label: i18n.translate(
      'xpack.apm.settings.agentConf.transactionMaxSpansConfigInputLabel',
      { defaultMessage: 'Transaction max spans' }
    ),
    helpText: i18n.translate(
      'xpack.apm.settings.agentConf.transactionMaxSpansConfigInputHelpText',
      {
        defaultMessage:
          'Limits the amount of spans that are recorded per transaction. Default is 500.'
      }
    ),
    placeholder: i18n.translate(
      'xpack.apm.settings.agentConf.transactionMaxSpansConfigInputPlaceholderText',
      { defaultMessage: 'Set transaction max spans' }
    ),
    validationError: i18n.translate(
      'xpack.apm.settings.agentConf.transactionMaxSpansConfigInputErrorText',
      { defaultMessage: 'Must be between 0 and 32000' }
    ),
    min: 0,
    max: 32000
  }
];

export function isValid(setting: SettingDefinition, value: unknown) {
  return isRight(setting.validation.decode(value));
}
