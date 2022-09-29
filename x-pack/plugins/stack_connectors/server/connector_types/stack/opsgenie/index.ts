/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingConnectorFeatureId,
  SecurityConnectorFeatureId,
  UptimeConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { OpsgenieConnector } from './connector';
import { ConfigSchema, SecretsSchema } from './schema';
import { Config, Secrets } from './types';

export const OpsgenieId = '.opsgenie';

export const getOpsgenieConnectorType = (): SubActionConnectorType<Config, Secrets> => {
  return {
    Service: OpsgenieConnector,
    // TODO: determine license requirement
    minimumLicenseRequired: 'gold',
    name: 'Opsgenie Connector',
    id: OpsgenieId,
    schema: { config: ConfigSchema, secrets: SecretsSchema },
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
  };
};
