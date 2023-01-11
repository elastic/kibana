/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  // SlackPublicConfigurationType,
  SlackSecretConfigurationType,
  ExternalServiceValidation,
} from './types';
// import * as i18n from './translations';

// export const validateCommonConfig = (
//   configObject: SlackPublicConfigurationType,
//   validatorServices: ValidatorServices
// ) => {
//   const { configurationUtilities } = validatorServices;
//   try {
//     // configurationUtilities.ensureUriAllowed(configObject.url);
//   } catch (allowedListError) {
//     throw new Error(i18n.ALLOWED_HOSTS_ERROR(allowedListError.message));
//   }
// };

// Why is this type empty?
export const validateCommonSecrets = (
  secrets: SlackSecretConfigurationType,
  validatorServices: ValidatorServices
) => {};

export const validate: ExternalServiceValidation = {
  // config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
