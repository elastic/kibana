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
import { TINES_CONNECTOR_ID, TINES_TITLE } from '../../../common/tines/constants';
import { TinesConfigSchema, TinesSecretsSchema } from '../../../common/tines/schema';
import { TinesConfig, TinesSecrets } from '../../../common/tines/types';
import { TinesConnector } from './tines';
import { renderParameterTemplates } from './render';

export const getTinesConnectorType = (): SubActionConnectorType<TinesConfig, TinesSecrets> => ({
  id: TINES_CONNECTOR_ID,
  name: TINES_TITLE,
  Service: TinesConnector,
  schema: {
    config: TinesConfigSchema,
    secrets: TinesSecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('url') }],
  supportedFeatureIds: [SecurityConnectorFeatureId],
  minimumLicenseRequired: 'gold' as const,
  renderParameterTemplates,
});
