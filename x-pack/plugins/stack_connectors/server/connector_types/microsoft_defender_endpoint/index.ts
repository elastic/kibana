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
import { SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { MicrosoftDefenderEndpointConnector } from './microsoft_defender_endpoint';
import {
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
} from '../../../common/microsoft_defender_endpoint/types';
import {
  MicrosoftDefenderEndpointConfigSchema,
  MicrosoftDefenderEndpointSecretsSchema,
} from '../../../common/microsoft_defender_endpoint/schema';
import {
  MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  MICROSOFT_DEFENDER_ENDPOINT_TITLE,
} from '../../../common/microsoft_defender_endpoint/constants';

export const getMicrosoftDefenderEndpointConnectorType = (): SubActionConnectorType<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> => ({
  id: MICROSOFT_DEFENDER_ENDPOINT_CONNECTOR_ID,
  name: MICROSOFT_DEFENDER_ENDPOINT_TITLE,
  getService: (params) => new MicrosoftDefenderEndpointConnector(params),
  schema: {
    config: MicrosoftDefenderEndpointConfigSchema,
    secrets: MicrosoftDefenderEndpointSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [SecurityConnectorFeatureId],
  minimumLicenseRequired: 'enterprise' as const,
});
