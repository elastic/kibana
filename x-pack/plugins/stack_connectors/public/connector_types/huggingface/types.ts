/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { HuggingFaceProviderType, SUB_ACTION } from '../../../common/huggingFace/constants';
import { RunActionParams } from '../../../common/huggingFace/types';

export interface ActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: RunActionParams;
}

export interface Config {
  apiProvider: HuggingFaceProviderType;
  apiUrl: string;
}

export interface Secrets {
  apiKey: string;
}

export type HuggingFaceConnector = ConnectorTypeModel<Config, Secrets, ActionParams>;
export type HuggingFaceActionConnector = UserConfiguredActionConnector<Config, Secrets>;
