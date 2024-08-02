/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { SUB_ACTION } from '../../../common/gemini/constants';
import { RunActionParams } from '../../../common/gemini/types';

export interface GeminiActionParams {
  subAction: SUB_ACTION.RUN | SUB_ACTION.TEST | SUB_ACTION.DASHBOARD;
  subActionParams: RunActionParams;
}

export interface Config {
  apiUrl: string;
  defaultModel: string;
  gcpRegion: string;
  gcpProjectID: string;
}

export interface Secrets {
  credentialsJson: string;
}

export type GeminiConnector = ConnectorTypeModel<Config, Secrets, GeminiActionParams>;
