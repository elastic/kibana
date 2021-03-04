/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum DataStream {
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
}

// values must match keys in the integration package
export enum ConfigKeys {
  PORTS = 'ports',
  HOSTS = 'hosts',
  MAX_REDIRECTS = 'max_redirects',
  MONITOR_TYPE = 'type',
  NAME = 'name',
  PROXY_URL = 'proxy_url',
  PROXY_USE_LOCAL_RESOLVER = 'proxy_use_local_resolver',
  SCHEDULE = 'schedule',
  SERVICE_NAME = 'service.name',
  TAGS = 'tags',
  TIMEOUT = 'timeout',
  URLS = 'urls',
  WAIT = 'wait',
}

export interface ICustomFields {
  [ConfigKeys.PORTS]: string;
  [ConfigKeys.HOSTS]: string;
  [ConfigKeys.MAX_REDIRECTS]: number;
  [ConfigKeys.MONITOR_TYPE]: DataStream;
  [ConfigKeys.PROXY_URL]: string;
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: boolean;
  [ConfigKeys.SCHEDULE]: number;
  [ConfigKeys.SERVICE_NAME]: string;
  [ConfigKeys.TIMEOUT]: number;
  [ConfigKeys.URLS]: string;
  [ConfigKeys.TAGS]: string[];
  [ConfigKeys.WAIT]: number;
}

export type Config = {
  [ConfigKeys.NAME]: string;
} & ICustomFields;
