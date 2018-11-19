/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { supportedConfigs } from './config_schemas';
import { YamlConfigSchema } from './lib/lib';

interface ConfigSchema {
  text: string;
  value: string;
  config: YamlConfigSchema[];
}

let translatedConfigs: ConfigSchema[];
const matchLabel = (labelId: string) => {
  switch (labelId) {
    case 'filebeatInputConfig.paths.ui.label':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsLabel', {
        defaultMessage: 'Paths',
      });
    case 'filebeatInputConfig.paths.ui.helpText':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsDescription', {
        defaultMessage: 'Put each of the paths on a separate line',
      });
    case 'filebeatInputConfig.paths.error':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.pathsErrorMessage', {
        defaultMessage: 'One file path per line',
      });
    case 'filebeatInputConfig.other.ui.label':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      });
    case 'filebeatInputConfig.other.ui.helpText':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigDescription', {
        defaultMessage: 'Use YAML format to specify other settings for the Filebeat Input',
      });
    case 'filebeatInputConfig.other.error':
      return i18n.translate('xpack.beatsManagement.filebeatInputConfig.otherConfigErrorMessage', {
        defaultMessage: 'Use valid YAML format',
      });

    case 'filebeatModuleConfig.module.ui.label':
      return i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleLabel', {
        defaultMessage: 'Module',
      });
    case 'filebeatModuleConfig.module.error':
      return i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleErrorMessage', {
        defaultMessage: 'Please select a module',
      });
    case 'filebeatModuleConfig.other.ui.label':
      return i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      });
    case 'filebeatModuleConfig.other.ui.helpText':
      return i18n.translate('xpack.beatsManagement.filebeatModuleConfig.moduleDescription', {
        defaultMessage: 'Use YAML format to specify other settings for the Filebeat Module',
      });
    case 'filebeatModuleConfig.other.error':
      return i18n.translate('xpack.beatsManagement.filebeatModuleConfig.otherConfigErrorMessage', {
        defaultMessage: 'Use valid YAML format',
      });

    case 'metricbeatModuleConfig.module.ui.label':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleLabel', {
        defaultMessage: 'Module',
      });
    case 'metricbeatModuleConfig.module.error':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.moduleErrorMessage', {
        defaultMessage: 'Please select a module',
      });
    case 'metricbeatModuleConfig.hosts.ui.label':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsLabel', {
        defaultMessage: 'Hosts',
      });
    case 'metricbeatModuleConfig.hosts.ui.helpText':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsDescription', {
        defaultMessage: 'Put each of the paths on a seperate line',
      });
    case 'metricbeatModuleConfig.hosts.error':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.hostsErrorMessage', {
        defaultMessage: 'One file host per line',
      });
    case 'metricbeatModuleConfig.period.ui.label':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodLabel', {
        defaultMessage: 'Period',
      });
    case 'metricbeatModuleConfig.period.error':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.periodErrorMessage', {
        defaultMessage: 'Invalid Period, must be formatted as `10s` for 10 seconds',
      });
    case 'metricbeatModuleConfig.other.ui.label':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigLabel', {
        defaultMessage: 'Other Config',
      });
    case 'metricbeatModuleConfig.other.ui.helpText':
      return i18n.translate('xpack.beatsManagement.metricbeatModuleConfig.otherConfigDescription', {
        defaultMessage: 'Use YAML format to specify other settings for the Metricbeat Module',
      });
    case 'metricbeatModuleConfig.other.error':
      return i18n.translate(
        'xpack.beatsManagement.metricbeatModuleConfig.otherConfigErrorMessage',
        {
          defaultMessage: 'Use valid YAML format',
        }
      );

    case 'outputConfig.output.ui.label':
      return i18n.translate('xpack.beatsManagement.outputConfig.outputTypeLabel', {
        defaultMessage: 'Output Type',
      });
    case 'outputConfig.output.error':
      return i18n.translate('xpack.beatsManagement.outputConfig.outputTypeErrorMessage', {
        defaultMessage: 'Please select an output type',
      });
    case 'outputConfig.hosts.ui.label':
      return i18n.translate('xpack.beatsManagement.outputConfig.hostsLabel', {
        defaultMessage: 'Hosts',
      });
    case 'outputConfig.hosts.error':
      return i18n.translate('xpack.beatsManagement.outputConfig.hostsErrorMessage', {
        defaultMessage: 'One file host per line',
      });
    case 'outputConfig.username.ui.label':
      return i18n.translate('xpack.beatsManagement.outputConfig.usernameLabel', {
        defaultMessage: 'Username',
      });
    case 'outputConfig.username.error':
      return i18n.translate('xpack.beatsManagement.outputConfig.usernameErrorMessage', {
        defaultMessage: 'Unprocessable username',
      });
    case 'outputConfig.password.ui.label':
      return i18n.translate('xpack.beatsManagement.outputConfig.passwordLabel', {
        defaultMessage: 'Password',
      });
    case 'outputConfig.password.error':
      return i18n.translate('xpack.beatsManagement.outputConfig.passwordErrorMessage', {
        defaultMessage: 'Unprocessable password',
      });

    case 'supportedConfigs.filebeatInput.text':
      return i18n.translate('xpack.beatsManagement.tagConfig.filebeatInputLabel', {
        defaultMessage: 'Filebeat Input',
      });
    case 'supportedConfigs.filebeatModule.text':
      return i18n.translate('xpack.beatsManagement.tagConfig.filebeatModuleLabel', {
        defaultMessage: 'Filebeat Module',
      });
    case 'supportedConfigs.metricbeatModule.text':
      return i18n.translate('xpack.beatsManagement.tagConfig.metricbeatModuleLabel', {
        defaultMessage: 'Metricbeat Module',
      });
    case 'supportedConfigs.output.text':
      return i18n.translate('xpack.beatsManagement.tagConfig.outputLabel', {
        defaultMessage: 'Output',
      });
    default:
      return labelId;
  }
};

export const getSupportedConfig = () => {
  if (translatedConfigs) {
    return translatedConfigs;
  }

  translatedConfigs = cloneDeep(supportedConfigs);

  translatedConfigs.forEach(({ text, config }) => {
    if (text) {
      text = matchLabel(text);
    }

    config.forEach(yanlConfig => {
      if (yanlConfig.ui.label) {
        yanlConfig.ui.label = matchLabel(yanlConfig.ui.label);
      }
      if (yanlConfig.ui.helpText) {
        yanlConfig.ui.helpText = matchLabel(yanlConfig.ui.helpText);
      }
      if (yanlConfig.error) {
        yanlConfig.error = matchLabel(yanlConfig.error);
      }
    });
  });

  return translatedConfigs;
};
