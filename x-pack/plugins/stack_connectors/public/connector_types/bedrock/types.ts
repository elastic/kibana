/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/bedrock/constants';
import { BedrockRunActionParams } from '../../../common/bedrock/types';

export interface BedrockActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: BedrockRunActionParams;
}

export interface BedrockConfig {
  apiUrl: string;
  defaultModel: string;
}

export interface BedrockSecrets {
  accessKey: string;
  secret: string;
}

export type BedrockConnector = ConnectorTypeModel<
  BedrockConfig,
  BedrockSecrets,
  BedrockActionParams
>;
