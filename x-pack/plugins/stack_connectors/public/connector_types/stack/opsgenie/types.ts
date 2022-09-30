/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type {
  CloseAlertParams,
  CreateAlertParams,
  Config,
  Secrets,
} from '../../../../server/connector_types/stack/opsgenie/types';

export type OpsgenieActionConnector = UserConfiguredActionConnector<Config, Secrets>;

export interface CreateAlertActionParams {
  subAction: 'createAlert';
  subActionParams: CreateAlertParams;
}

export interface CloseAlertActionParams {
  subAction: 'closeAlert';
  subActionParams: CloseAlertParams;
}

export type OpsgenieActionParams = CreateAlertActionParams | CloseAlertActionParams;

export type { Config, Secrets } from '../../../../server/connector_types/stack/opsgenie/types';
