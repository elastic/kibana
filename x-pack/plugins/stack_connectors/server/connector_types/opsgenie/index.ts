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
import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import { OpsgenieConnectorTypeId } from '../../../common';
import { OpsgenieConnector } from './connector';
import { ConfigSchema, SecretsSchema } from './schema';
import { Config, Secrets } from './types';
import * as i18n from './translations';
import { renderParameterTemplates } from './render_template_variables';

export const getOpsgenieConnectorType = (): SubActionConnectorType<Config, Secrets> => {
  return {
    Service: OpsgenieConnector,
    minimumLicenseRequired: 'platinum',
    name: i18n.OPSGENIE_NAME,
    id: OpsgenieConnectorTypeId,
    schema: { config: ConfigSchema, secrets: SecretsSchema },
    validators: [{ type: ValidatorType.CONFIG, validator: urlAllowListValidator('apiUrl') }],
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    renderParameterTemplates,
  };
};

export type {
  Config as OpsgenieActionConfig,
  Secrets as OpsgenieActionSecrets,
  Params as OpsgenieActionParams,
  CreateAlertSubActionParams as OpsgenieCreateAlertSubActionParams,
  CloseAlertSubActionParams as OpsgenieCloseAlertSubActionParams,
  CreateAlertParams as OpsgenieCreateAlertParams,
  CloseAlertParams as OpsgenieCloseAlertParams,
} from './types';
