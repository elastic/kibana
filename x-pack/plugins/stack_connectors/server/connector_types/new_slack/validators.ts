/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import type { SlackConfig, SlackSecrets } from '../../../common/slack/types';
import type { ExternalServiceValidation } from './types';
// import * as i18n from './translations';

export const validateCommonConfig = (
  configObject: SlackConfig,
  validatorServices: ValidatorServices
) => {};

// Why is this type empty?
export const validateCommonSecrets = (
  secrets: SlackSecrets,
  validatorServices: ValidatorServices
) => {};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
