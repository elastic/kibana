/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { ActionsConfigurationUtilities } from '../../../actions_config';
import {
  ConnectorSecretConfigurationType,
  ConnectorPublicConfigurationType,
  ConnectorValidation,
} from '../types';

import * as i18n from './translations';

const validateConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ConnectorPublicConfigurationType
) => {
  try {
    if (isEmpty(configObject.casesConfiguration.mapping)) {
      return i18n.MAPPING_EMPTY;
    }

    configurationUtilities.ensureWhitelistedUri(configObject.apiUrl);
  } catch (whitelistError) {
    return i18n.WHITE_LISTED_ERROR(whitelistError.message);
  }
};

const validateSecrets = (
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: ConnectorSecretConfigurationType
) => {};

export const validate: ConnectorValidation = {
  config: validateConfig,
  secrets: validateSecrets,
};
