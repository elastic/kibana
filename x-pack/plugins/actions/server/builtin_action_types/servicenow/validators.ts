/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateCommonConfig, validateCommonSecrets } from '../common/validators';
import { ConnectorValidation } from '../common/types';

export const validate: ConnectorValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
