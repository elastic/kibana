/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionConnector, UserConfiguredActionConnector } from '../../../types';

export type InitialConnector<Config, Secrets> = Partial<
  UserConfiguredActionConnector<Config, Secrets>
> &
  Pick<UserConfiguredActionConnector<Config, Secrets>, 'actionTypeId' | 'config' | 'secrets'>;

export type Connector<Config = Record<string, unknown>, Secrets = Record<string, unknown>> =
  | InitialConnector<Record<string, unknown>, Record<string, unknown>>
  | ActionConnector<Config, Secrets>;
