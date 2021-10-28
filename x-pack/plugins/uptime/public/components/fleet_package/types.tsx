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
  BROWSER = 'browser',
}

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export enum ResponseBodyIndexPolicy {
  ALWAYS = 'always',
  NEVER = 'never',
  ON_ERROR = 'on_error',
}

export enum MonacoEditorLangId {
  JSON = 'xjson',
  PLAINTEXT = 'plaintext',
  XML = 'xml',
  JAVASCRIPT = 'javascript',
}

export enum Mode {
  FORM = 'form',
  JSON = 'json',
  PLAINTEXT = 'text',
  XML = 'xml',
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

export enum VerificationMode {
  CERTIFICATE = 'certificate',
  FULL = 'full',
  NONE = 'none',
  STRICT = 'strict',
}

export enum TLSVersion {
  ONE_ZERO = 'TLSv1.0',
  ONE_ONE = 'TLSv1.1',
  ONE_TWO = 'TLSv1.2',
  ONE_THREE = 'TLSv1.3',
}

export enum ScreenshotOption {
  ON = 'on',
  OFF = 'off',
  ONLY_ON_FAILURE = 'only-on-failure',
}

// values must match keys in the integration package
export enum ConfigKeys {
  APM_SERVICE_NAME = 'service.name',
  HOSTS = 'hosts',
  IGNORE_HTTPS_ERRORS = 'ignore_https_errors',
  JOURNEY_FILTERS_MATCH = 'filter_journeys.match',
  JOURNEY_FILTERS_TAGS = 'filter_journeys.tags',
  MAX_REDIRECTS = 'max_redirects',
  METADATA = '__ui',
  MONITOR_TYPE = 'type',
  NAME = 'name',
  PARAMS = 'params',
  PASSWORD = 'password',
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
  SCREENSHOTS = 'screenshots',
  SOURCE_INLINE = 'source.inline.script',
  SOURCE_ZIP_URL = 'source.zip_url.url',
  SOURCE_ZIP_USERNAME = 'source.zip_url.username',
  SOURCE_ZIP_PASSWORD = 'source.zip_url.password',
  SOURCE_ZIP_FOLDER = 'source.zip_url.folder',
  SOURCE_ZIP_PROXY_URL = 'source.zip_url.proxy_url',
  SYNTHETICS_ARGS = 'synthetics_args',
  TLS_CERTIFICATE_AUTHORITIES = 'ssl.certificate_authorities',
  TLS_CERTIFICATE = 'ssl.certificate',
  TLS_KEY = 'ssl.key',
  TLS_KEY_PASSPHRASE = 'ssl.key_passphrase',
  TLS_VERIFICATION_MODE = 'ssl.verification_mode',
  TLS_VERSION = 'ssl.supported_protocols',
  TAGS = 'tags',
  TIMEOUT = 'timeout',
  URLS = 'urls',
  USERNAME = 'username',
  WAIT = 'wait',
  ZIP_URL_TLS_CERTIFICATE_AUTHORITIES = 'source.zip_url.ssl.certificate_authorities',
  ZIP_URL_TLS_CERTIFICATE = 'source.zip_url.ssl.certificate',
  ZIP_URL_TLS_KEY = 'source.zip_url.ssl.key',
  ZIP_URL_TLS_KEY_PASSPHRASE = 'source.zip_url.ssl.key_passphrase',
  ZIP_URL_TLS_VERIFICATION_MODE = 'source.zip_url.ssl.verification_mode',
  ZIP_URL_TLS_VERSION = 'source.zip_url.ssl.supported_protocols',
}

export interface Metadata {
  is_tls_enabled?: boolean;
  is_zip_url_tls_enabled?: boolean;
  script_source?: {
    is_generated_script: boolean;
    file_name: string;
  };
}

export interface ICommonFields {
  [ConfigKeys.MONITOR_TYPE]: DataStream;
  [ConfigKeys.SCHEDULE]: { number: string; unit: ScheduleUnit };
  [ConfigKeys.APM_SERVICE_NAME]: string;
  [ConfigKeys.TIMEOUT]: string;
  [ConfigKeys.TAGS]: string[];
}

export type IHTTPSimpleFields = {
  [ConfigKeys.METADATA]: Metadata;
  [ConfigKeys.MAX_REDIRECTS]: string;
  [ConfigKeys.URLS]: string;
} & ICommonFields;

export type ITCPSimpleFields = {
  [ConfigKeys.METADATA]: Metadata;
  [ConfigKeys.HOSTS]: string;
} & ICommonFields;

export type IICMPSimpleFields = {
  [ConfigKeys.HOSTS]: string;
  [ConfigKeys.WAIT]: string;
} & ICommonFields;

export interface ITLSFields {
  [ConfigKeys.TLS_CERTIFICATE_AUTHORITIES]?: string;
  [ConfigKeys.TLS_CERTIFICATE]?: string;
  [ConfigKeys.TLS_KEY]?: string;
  [ConfigKeys.TLS_KEY_PASSPHRASE]?: string;
  [ConfigKeys.TLS_VERIFICATION_MODE]?: VerificationMode;
  [ConfigKeys.TLS_VERSION]?: TLSVersion[];
}

export interface IZipUrlTLSFields {
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES]?: ITLSFields[ConfigKeys.TLS_CERTIFICATE_AUTHORITIES];
  [ConfigKeys.ZIP_URL_TLS_CERTIFICATE]?: ITLSFields[ConfigKeys.TLS_CERTIFICATE];
  [ConfigKeys.ZIP_URL_TLS_KEY]?: ITLSFields[ConfigKeys.TLS_KEY];
  [ConfigKeys.ZIP_URL_TLS_KEY_PASSPHRASE]?: ITLSFields[ConfigKeys.TLS_KEY_PASSPHRASE];
  [ConfigKeys.ZIP_URL_TLS_VERIFICATION_MODE]?: ITLSFields[ConfigKeys.TLS_VERIFICATION_MODE];
  [ConfigKeys.ZIP_URL_TLS_VERSION]?: ITLSFields[ConfigKeys.TLS_VERSION];
}

export interface IHTTPAdvancedFields {
  [ConfigKeys.PASSWORD]: string;
  [ConfigKeys.PROXY_URL]: string;
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: string[];
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: string[];
  [ConfigKeys.RESPONSE_BODY_INDEX]: ResponseBodyIndexPolicy;
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: Record<string, string>;
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: boolean;
  [ConfigKeys.RESPONSE_STATUS_CHECK]: string[];
  [ConfigKeys.REQUEST_BODY_CHECK]: { value: string; type: Mode };
  [ConfigKeys.REQUEST_HEADERS_CHECK]: Record<string, string>;
  [ConfigKeys.REQUEST_METHOD_CHECK]: string;
  [ConfigKeys.USERNAME]: string;
}

export interface ITCPAdvancedFields {
  [ConfigKeys.PROXY_URL]: string;
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: boolean;
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: string;
  [ConfigKeys.REQUEST_SEND_CHECK]: string;
}

export type IBrowserSimpleFields = {
  [ConfigKeys.METADATA]: Metadata;
  [ConfigKeys.SOURCE_INLINE]: string;
  [ConfigKeys.SOURCE_ZIP_URL]: string;
  [ConfigKeys.SOURCE_ZIP_FOLDER]: string;
  [ConfigKeys.SOURCE_ZIP_USERNAME]: string;
  [ConfigKeys.SOURCE_ZIP_PASSWORD]: string;
  [ConfigKeys.SOURCE_ZIP_PROXY_URL]: string;
  [ConfigKeys.PARAMS]: string;
} & ICommonFields &
  IZipUrlTLSFields;

export interface IBrowserAdvancedFields {
  [ConfigKeys.SYNTHETICS_ARGS]: string[];
  [ConfigKeys.SCREENSHOTS]: string;
  [ConfigKeys.JOURNEY_FILTERS_MATCH]: string;
  [ConfigKeys.JOURNEY_FILTERS_TAGS]: string[];
  [ConfigKeys.IGNORE_HTTPS_ERRORS]: boolean;
}

export type HTTPFields = IHTTPSimpleFields & IHTTPAdvancedFields & ITLSFields;
export type TCPFields = ITCPSimpleFields & ITCPAdvancedFields & ITLSFields;
export type ICMPFields = IICMPSimpleFields;
export type BrowserFields = IBrowserSimpleFields & IBrowserAdvancedFields;

export type ICustomFields = HTTPFields &
  TCPFields &
  ICMPFields &
  BrowserFields & {
    [ConfigKeys.NAME]: string;
  };

export interface PolicyConfig {
  [DataStream.HTTP]: HTTPFields;
  [DataStream.TCP]: TCPFields;
  [DataStream.ICMP]: ICMPFields;
  [DataStream.BROWSER]: BrowserFields;
}

export type Validator = (config: Partial<ICustomFields>) => boolean;

export type Validation = Partial<Record<ConfigKeys, Validator>>;

export const contentTypesToMode = {
  [ContentType.FORM]: Mode.FORM,
  [ContentType.JSON]: Mode.JSON,
  [ContentType.TEXT]: Mode.PLAINTEXT,
  [ContentType.XML]: Mode.XML,
};
