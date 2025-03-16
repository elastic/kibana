/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 * 
 * By: Antonio Piazza @antman1p
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { SUB_ACTION } from '../../../common/openai/constants';
import { RunActionParams } from '../../../common/openai/types';

export interface ActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST;
  subActionParams: RunActionParams;
}

export interface Config {
  apiUrl: string;
  defaultModel?: string;
  certPath: string;
  keyPath: string;
  headers?: Record<string, string>;
}

export interface Secrets {
  apiKey: string;
}

export type OpenAIPkiConnector = ConnectorTypeModel<Config, Secrets, ActionParams>;
export type OpenAIPkiActionConnector = UserConfiguredActionConnector<Config, Secrets>;
