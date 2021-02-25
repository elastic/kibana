/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DataStream {
  HTTP = 'synthetics/http',
  TCP = 'synthetics/tcp',
  ICMP = 'synthetics/icmp',
}

// values must match keys in the integration package
export enum ConfigKeys {
  MAX_REDIRECTS = 'max_redirects',
  MONITOR_TYPE = 'type',
  NAME = 'name',
  PROXY_URL = 'proxy_url',
  SCHEDULE = 'schedule',
  SERVICE_NAME = 'service.name',
  TAGS = 'tags',
  TIMEOUT = 'timeout',
  URLS = 'urls',
}

export type Config = Record<ConfigKeys, string | number | string[]>;

export interface ICustomFields {
  [ConfigKeys.MAX_REDIRECTS]: number;
  [ConfigKeys.MONITOR_TYPE]: DataStream;
  [ConfigKeys.PROXY_URL]: string;
  [ConfigKeys.SCHEDULE]: number;
  [ConfigKeys.SERVICE_NAME]: string;
  [ConfigKeys.TIMEOUT]: number;
  [ConfigKeys.URLS]: string;
  [ConfigKeys.TAGS]: string[];
}
