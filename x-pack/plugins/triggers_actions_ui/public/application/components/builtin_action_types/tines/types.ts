/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '../../../../types';

export type TinesActionConnector = UserConfiguredActionConnector<TinesConfig, TinesSecrets>;

export interface TinesConfig {
  url: string;
}

export interface TinesSecrets {
  email: string;
  apiToken: string;
}

export interface TinesParams {
  storyId: string;
  actionId: string;
}

export interface Stories {
  id: string;
  name: string;
}
