/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '../../actions_config';
import { ExternalServiceValidation, SwimlanePublicConfigurationType } from './types';
import * as i18n from './translations';

export const validateCommonConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: SwimlanePublicConfigurationType
) => {
  try {
    configurationUtilities.ensureUriAllowed(configObject.apiUrl);
  } catch (allowedListError) {
    return i18n.ALLOWED_HOSTS_ERROR(allowedListError.message);
  }
};

export const validateCommonSecrets = () => {};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
