/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  HTTPFields,
  TCPFields,
  ICMPFields,
  BrowserFields,
  ConfigKey,
  ContentType,
  DataStream,
  MonitorFields,
  Mode,
} from '../../../common/runtime_types/monitor_management';
export * from '../../../common/runtime_types/monitor_management';

export type Monitor = Partial<MonitorFields>;

export interface PolicyConfig {
  [DataStream.HTTP]: HTTPFields;
  [DataStream.TCP]: TCPFields;
  [DataStream.ICMP]: ICMPFields;
  [DataStream.BROWSER]: BrowserFields;
}

export type Validator = (config: Partial<MonitorFields>) => boolean;

export type Validation = Partial<Record<ConfigKey, Validator>>;

export const contentTypesToMode = {
  [ContentType.FORM]: Mode.FORM,
  [ContentType.JSON]: Mode.JSON,
  [ContentType.TEXT]: Mode.PLAINTEXT,
  [ContentType.XML]: Mode.XML,
};

export type ThrottlingConfigKey =
  | ConfigKeys.DOWNLOAD_SPEED
  | ConfigKeys.UPLOAD_SPEED
  | ConfigKeys.LATENCY;

export const configKeyToThrottlingSuffix: Record<ThrottlingConfigKey, ThrottlingSuffix> = {
  [ConfigKeys.DOWNLOAD_SPEED]: ThrottlingSuffix.DOWNLOAD,
  [ConfigKeys.UPLOAD_SPEED]: ThrottlingSuffix.UPLOAD,
  [ConfigKeys.LATENCY]: ThrottlingSuffix.LATENCY,
};
