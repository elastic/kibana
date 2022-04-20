/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { Logger } from '@kbn/logging';
import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import { ActionsConfigurationUtilities } from '../actions_config';
import { BasicConnector } from '../connectors/basic';
import { ActionTypeParams, Services } from '../types';
export interface ServiceParams<Config, Secrets> {
  config: Config;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  secrets: Secrets;
  services: Services;
}

export type IService<Config, Secrets> = new (
  params: ServiceParams<Config, Secrets>
) => BasicConnector<Config, Secrets>;

export interface HTTPConnectorType<Config, Secrets> {
  id: string;
  name: string;
  minimumLicenseRequired: LicenseType;
  schema: {
    config: Type<Config>;
    secrets: Type<Secrets>;
  };
  Service: IService<Config, Secrets>;
}

export interface ExecutorParams extends ActionTypeParams {
  subAction: string;
  subActionParams: Record<string, unknown>;
}

export type ExtractFunctionKeys<T> = {
  [P in keyof T]-?: T[P] extends Function ? P : never;
}[keyof T];
