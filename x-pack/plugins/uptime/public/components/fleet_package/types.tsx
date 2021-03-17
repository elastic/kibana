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

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  CONNECT = 'CONNECT',
  OPTIONS = 'OPTIONS',
  TRACE = 'TRACE',
  PATCH = 'PATCH',
}

export enum ResponseBodyIndexPolicy {
  ALWAYS = 'always',
  NEVER = 'never',
  ON_ERROR = 'on_error',
}

export enum ContentType {
  JSON = 'application/json',
  TEXT = 'text/plain',
  XML = 'application/xml',
  FORM = 'application/x-www-form-urlencoded',
}

export enum ScheduleUnit {
  MINUTES = 'm',
  SECONDS = 's',
}

export enum Mode {
  FORM = 'form',
  JSON = 'json',
  TEXT = 'text',
  XML = 'xml',
}

// values must match keys in the integration package
export enum ConfigKeys {
  HOSTS = 'hosts',
  MAX_REDIRECTS = 'max_redirects',
  MONITOR_TYPE = 'type',
  NAME = 'name',
  PROXY_URL = 'proxy_url',
  PROXY_USE_LOCAL_RESOLVER = 'proxy_use_local_resolver',
  RESPONSE_BODY_CHECK_NEGATIVE = 'check.response.body.negative',
  RESPONSE_BODY_CHECK_POSITIVE = 'check.response.body.positive',
  RESPONSE_BODY_INDEX = 'response.include_body',
  RESPONSE_HEADERS_CHECK = 'check.response.headers',
  RESPONSE_HEADERS_INDEX = 'response.include_headers',
  RESPONSE_RECEIVE_CHECK = 'check.receive',
  RESPONSE_STATUS_CHECK = 'check.response.status',
  REQUEST_BODY_CHECK = 'check.request.body',
  REQUEST_HEADERS_CHECK = 'check.request.headers',
  REQUEST_METHOD_CHECK = 'check.request.method',
  REQUEST_SEND_CHECK = 'check.send',
  SCHEDULE = 'schedule',
  SERVICE_NAME = 'service.name',
  TAGS = 'tags',
  TIMEOUT = 'timeout',
  URLS = 'urls',
  WAIT = 'wait',
}

export interface ISimpleFields {
  [ConfigKeys.HOSTS]: string;
  [ConfigKeys.MAX_REDIRECTS]: number;
  [ConfigKeys.MONITOR_TYPE]: DataStream;
  [ConfigKeys.PROXY_URL]: string;
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: boolean;
  [ConfigKeys.SCHEDULE]: { number: string; unit: string };
  [ConfigKeys.SERVICE_NAME]: string;
  [ConfigKeys.TIMEOUT]: number;
  [ConfigKeys.URLS]: string;
  [ConfigKeys.TAGS]: string[];
  [ConfigKeys.WAIT]: number;
}

export interface IHTTPAdvancedFields {
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: string[];
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: string[];
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy;
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: Record<string, string>;
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: boolean;
  [ConfigKeys.RESPONSE_STATUS_CHECK]: string[];
  [ConfigKeys.REQUEST_BODY_CHECK]: { value: string; type: Mode };
  [ConfigKeys.REQUEST_HEADERS_CHECK]: Record<string, string>;
  [ConfigKeys.REQUEST_METHOD_CHECK]: string;
}

export interface ITCPAdvancedFields {
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: string[];
  [ConfigKeys.REQUEST_SEND_CHECK]: string;
}

export type ICustomFields = ISimpleFields & IHTTPAdvancedFields & ITCPAdvancedFields;

export type Config = {
  [ConfigKeys.NAME]: string;
} & ICustomFields;

export type Validation = Partial<Record<ConfigKeys, (value: unknown) => void>>;
