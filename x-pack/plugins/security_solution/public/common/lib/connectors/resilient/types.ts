/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-restricted-imports */
/* eslint-disable @kbn/eslint/no-restricted-paths */

import {
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
} from '../../../../../../actions/server/builtin_action_types/resilient/types';

export { ResilientFieldsType } from '../../../../../../case/common/api/connectors';

export * from '../types';

export interface ResilientActionConnector {
  config: ResilientPublicConfigurationType;
  secrets: ResilientSecretConfigurationType;
}
