/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { OpenAiProviderType, SUB_ACTION } from '../../../common/gen_ai/constants';
import { GenAiRunActionParams } from '../../../common/gen_ai/types';

export interface GenerativeAiActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: GenAiRunActionParams;
}

export interface GenerativeAiConfig {
  apiProvider: OpenAiProviderType;
  apiUrl: string;
}

export interface GenerativeAiSecrets {
  apiKey: string;
}

export type GenerativeAiConnector = ConnectorTypeModel<
  GenerativeAiConfig,
  GenerativeAiSecrets,
  GenerativeAiActionParams
>;
export type GenerativeAiActionConnector = UserConfiguredActionConnector<
  GenerativeAiConfig,
  GenerativeAiSecrets
>;
