/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutorSubActionPushParams,
  MappingConfigType,
} from '@kbn/stack-connectors-plugin/server/connector_types/cases/swimlane/types';
import { UserConfiguredActionConnector } from '../../../../types';

export type SwimlaneActionConnector = UserConfiguredActionConnector<
  SwimlaneConfig,
  SwimlaneSecrets
>;

export interface SwimlaneConfig {
  apiUrl: string;
  appId: string;
  connectorType: SwimlaneConnectorType;
  mappings: SwimlaneMappingConfig;
}

export type MappingConfigurationKeys = keyof MappingConfigType;
export type SwimlaneMappingConfig = Record<keyof MappingConfigType, SwimlaneFieldMappingConfig>;

export interface SwimlaneFieldMappingConfig {
  id: string;
  key: string;
  name: string;
  fieldType: string;
}

export interface SwimlaneSecrets {
  apiToken: string;
}

export interface SwimlaneActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export interface SwimlaneFieldMap {
  key: string;
  name: string;
}

export enum SwimlaneConnectorType {
  All = 'all',
  Alerts = 'alerts',
  Cases = 'cases',
}
