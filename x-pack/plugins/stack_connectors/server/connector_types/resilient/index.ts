/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  AlertingConnectorFeatureId,
  CasesConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';

import { ResilientConfig, ResilientSecrets } from './types';
import { RESILIENT_CONNECTOR_ID } from './constants';
import * as i18n from './translations';
import {
  ExternalIncidentServiceConfigurationSchema,
  ExternalIncidentServiceSecretConfigurationSchema,
  PushToServiceIncidentSchema,
} from './schema';
import { ResilientConnector } from './resilient';

export const getResilientConnectorType = (): SubActionConnectorType<
  ResilientConfig,
  ResilientSecrets
> => ({
  id: RESILIENT_CONNECTOR_ID,
  minimumLicenseRequired: 'platinum',
  name: i18n.NAME,
  getService: (params) => new ResilientConnector(params, PushToServiceIncidentSchema),
  schema: {
    config: ExternalIncidentServiceConfigurationSchema,
    secrets: ExternalIncidentServiceSecretConfigurationSchema,
  },
  supportedFeatureIds: [
    AlertingConnectorFeatureId,
    CasesConnectorFeatureId,
    SecurityConnectorFeatureId,
  ],
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') }],
});
