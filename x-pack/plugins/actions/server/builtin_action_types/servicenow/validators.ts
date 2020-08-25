/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

import * as i18n from './translations';

export const validateCommonConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ServiceNowPublicConfigurationType
) => {
  if (
    configObject.incidentConfiguration !== null &&
    isEmpty(configObject.incidentConfiguration.mapping)
  ) {
    return i18n.MAPPING_EMPTY;
  }

  try {
    configurationUtilities.ensureUriAllowed(configObject.apiUrl);
  } catch (allowListError) {
    return i18n.WHITE_LISTED_ERROR(allowListError.message);
  }
};

export const validateCommonSecrets = (
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: ServiceNowSecretConfigurationType
) => {};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
