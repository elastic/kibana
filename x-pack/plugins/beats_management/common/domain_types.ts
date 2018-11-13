/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigurationBlockTypes } from './constants';

export enum FilebeatModuleName {
  system = 'system',
  apache2 = 'apache2',
  nginx = 'nginx',
  mongodb = 'mongodb',
  elasticsearch = 'elasticsearch',
}

export enum MetricbeatModuleName {
  system = 'system',
  apache2 = 'apache2',
  nginx = 'nginx',
  mongodb = 'mongodb',
  elasticsearch = 'elasticsearch',
}

export enum OutputType {
  elasticsearch = 'elasticsearch',
  logstash = 'logstash',
  kafka = 'kafka',
  console = 'console',
}

export interface FilebeatInputsConfig {
  paths: string[];
  other: string;
}
export interface FilebeatModuleConfig {
  module: FilebeatModuleName;
  other: string;
}
export interface MetricbeatModuleConfig {
  module: MetricbeatModuleName;
  hosts?: string[];
  period: string;
  other: string;
}

export type ConfigContent = FilebeatInputsConfig | FilebeatModuleConfig | MetricbeatModuleConfig;
export interface ConfigurationBlock {
  type: ConfigurationBlockTypes;
  description: string;
  configs: ConfigContent[];
}

export interface ReturnedConfigurationBlock
  extends Pick<ConfigurationBlock, Exclude<keyof ConfigurationBlock, 'configs'>> {
  config: ConfigContent;
}

export interface CMBeat {
  id: string;
  config_status: 'OK' | 'UNKNOWN' | 'ERROR';
  enrollment_token: string;
  active: boolean;
  access_token: string;
  verified_on?: string;
  type: string;
  version?: string;
  host_ip: string;
  host_name: string;
  ephemeral_id?: string;
  last_checkin?: Date;
  event_rate?: string;
  local_configuration_yml?: string;
  tags?: string[];
  central_configuration_yml?: string;
  metadata?: {};
  name?: string;
}

export interface CMPopulatedBeat extends CMBeat {
  full_tags: BeatTag[];
}

export interface BeatTag {
  id: string;
  configuration_blocks: ConfigurationBlock[];
  color?: string;
  last_updated: Date;
}
