/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { supportedConfigs } from './config_schemas';
import { YamlConfigSchema } from './lib/types';

interface ConfigSchema {
  text: string;
  value: string;
  config: YamlConfigSchema[];
}

let translatedConfigs: ConfigSchema[];
const supportedConfigLabelsMap = new Map<string, string>([
  [
    'filebeatInputConfig.paths.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsLabel', {
      defaultMessage: 'Paths',
    }),
  ],
  [
    'filebeatInputConfig.paths.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsDescription', {
      defaultMessage: 'Put each of the paths on a separate line',
    }),
  ],
  [
    'filebeatInputConfig.paths.error',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsErrorMessage', {
      defaultMessage: 'One file path per line',
    }),
  ],
  [
    'filebeatInputConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'filebeatInputConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Filebeat Input',
    }),
  ],
  [
    'filebeatInputConfig.other.error',
    i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],
  [
    'filebeatModuleConfig.module.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleLabel', {
      defaultMessage: 'Module',
    }),
  ],
  [
    'filebeatModuleConfig.module.error',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
  ],
  [
    'filebeatModuleConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'filebeatModuleConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Filebeat Module',
    }),
  ],
  [
    'filebeatModuleConfig.other.error',
    i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],

  [
    'metricbeatModuleConfig.module.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleLabel', {
      defaultMessage: 'Module',
    }),
  ],
  [
    'metricbeatModuleConfig.module.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleErrorMessage', {
      defaultMessage: 'Please select a module',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsLabel', {
      defaultMessage: 'Hosts',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.ui.helpText',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsDescription', {
      defaultMessage: 'Put each of the paths on a seperate line',
    }),
  ],
  [
    'metricbeatModuleConfig.hosts.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
  ],
  [
    'metricbeatModuleConfig.period.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodLabel', {
      defaultMessage: 'Period',
    }),
  ],
  [
    'metricbeatModuleConfig.period.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodErrorMessage', {
      defaultMessage: 'Invalid Period, must be formatted as `10s` for 10 seconds',
    }),
  ],
  [
    'metricbeatModuleConfig.other.ui.label',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigLabel', {
      defaultMessage: 'Other Config',
    }),
  ],
  [
    'metricbeatModuleConfig.other.ui.helpText',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigDescription', {
      defaultMessage: 'Use YAML format to specify other settings for the Metricbeat Module',
    }),
  ],
  [
    'metricbeatModuleConfig.other.error',
    i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigErrorMessage', {
      defaultMessage: 'Use valid YAML format',
    }),
  ],

  [
    'outputConfig.output.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.outputTypeLabel', {
      defaultMessage: 'Output Type',
    }),
  ],
  [
    'outputConfig.output.error',
    i18n.translate('xpack.beatsManagement.outputConfig.outputTypeErrorMessage', {
      defaultMessage: 'Please select an output type',
    }),
  ],
  [
    'outputConfig.hosts.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.hostsLabel', {
      defaultMessage: 'Hosts',
    }),
  ],
  [
    'outputConfig.hosts.error',
    i18n.translate('xpack.beatsManagement.outputConfig.hostsErrorMessage', {
      defaultMessage: 'One file host per line',
    }),
  ],
  [
    'outputConfig.username.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.usernameLabel', {
      defaultMessage: 'Username',
    }),
  ],
  [
    'outputConfig.username.error',
    i18n.translate('xpack.beatsManagement.outputConfig.usernameErrorMessage', {
      defaultMessage: 'Unprocessable username',
    }),
  ],
  [
    'outputConfig.password.ui.label',
    i18n.translate('xpack.beatsManagement.outputConfig.passwordLabel', {
      defaultMessage: 'Password',
    }),
  ],
  [
    'outputConfig.password.error',
    i18n.translate('xpack.beatsManagement.outputConfig.passwordErrorMessage', {
      defaultMessage: 'Unprocessable password',
    }),
  ],

  [
    'supportedConfigs.filebeatInput.text',
    i18n.translate('xpack.beatsManagement.tagConfig.filebeatInputLabel', {
      defaultMessage: 'Filebeat Input',
    }),
  ],
  [
    'supportedConfigs.filebeatModule.text',
    i18n.translate('xpack.beatsManagement.tagConfig.filebeatModuleLabel', {
      defaultMessage: 'Filebeat Module',
    }),
  ],
  [
    'supportedConfigs.metricbeatModule.text',
    i18n.translate('xpack.beatsManagement.tagConfig.metricbeatModuleLabel', {
      defaultMessage: 'Metricbeat Module',
    }),
  ],
  [
    'supportedConfigs.output.text',
    i18n.translate('xpack.beatsManagement.tagConfig.outputLabel', {
      defaultMessage: 'Output',
    }),
  ],
]);

export const getSupportedConfig = () => {
  if (translatedConfigs) {
    return translatedConfigs;
  }

  translatedConfigs = cloneDeep(supportedConfigs);
  translatedConfigs.forEach(({ text, config }, index) => {
    if (text) {
      translatedConfigs[index].text = supportedConfigLabelsMap.get(text) || '';
    }

    config.forEach(yanlConfig => {
      if (yanlConfig.ui.label) {
        yanlConfig.ui.label = supportedConfigLabelsMap.get(yanlConfig.ui.label) || '';
      }
      if (yanlConfig.ui.helpText) {
        yanlConfig.ui.helpText = supportedConfigLabelsMap.get(yanlConfig.ui.helpText);
      }
      if (yanlConfig.error) {
        yanlConfig.error = supportedConfigLabelsMap.get(yanlConfig.error) || '';
      }
    });
  });

  return translatedConfigs;
};
