/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { tEnum } from '../../utils/t_enum';

// values must match keys in the integration package
export enum ConfigKey {
  APM_SERVICE_NAME = 'service.name',
  ENABLED = 'enabled',
  HOSTS = 'hosts',
  IGNORE_HTTPS_ERRORS = 'ignore_https_errors',
  JOURNEY_FILTERS_MATCH = 'filter_journeys.match',
  JOURNEY_FILTERS_TAGS = 'filter_journeys.tags',
  MAX_REDIRECTS = 'max_redirects',
  METADATA = '__ui',
  MONITOR_TYPE = 'type',
  NAME = 'name',
  NAMESPACE = 'namespace',
  LOCATIONS = 'locations',
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
  REVISION = 'revision',
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
  THROTTLING_CONFIG = 'throttling.config',
  IS_THROTTLING_ENABLED = 'throttling.is_enabled',
  DOWNLOAD_SPEED = 'throttling.download_speed',
  UPLOAD_SPEED = 'throttling.upload_speed',
  LATENCY = 'throttling.latency',
  URLS = 'urls',
  PORT = 'url.port',
  USERNAME = 'username',
  WAIT = 'wait',
  ZIP_URL_TLS_CERTIFICATE_AUTHORITIES = 'source.zip_url.ssl.certificate_authorities',
  ZIP_URL_TLS_CERTIFICATE = 'source.zip_url.ssl.certificate',
  ZIP_URL_TLS_KEY = 'source.zip_url.ssl.key',
  ZIP_URL_TLS_KEY_PASSPHRASE = 'source.zip_url.ssl.key_passphrase',
  ZIP_URL_TLS_VERIFICATION_MODE = 'source.zip_url.ssl.verification_mode',
  ZIP_URL_TLS_VERSION = 'source.zip_url.ssl.supported_protocols',
}

export const ConfigKeyCodec = tEnum<ConfigKey>('ConfigKey', ConfigKey);
export type ConfigKeyType = t.TypeOf<typeof ConfigKeyCodec>;
