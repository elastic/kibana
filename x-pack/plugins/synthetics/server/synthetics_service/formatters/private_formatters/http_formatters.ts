/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, HTTPFields } from '../../../../common/runtime_types';
import { tlsFormatters } from './tls_formatters';

import { Formatter, commonFormatters } from './common_formatters';
import {
  stringToJsonFormatter,
  arrayToJsonFormatter,
  objectToJsonFormatter,
} from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

export const httpFormatters: HTTPFormatMap = {
  ...commonFormatters,
  ...tlsFormatters,
  [ConfigKey.MAX_REDIRECTS]: null,
  [ConfigKey.REQUEST_METHOD_CHECK]: null,
  [ConfigKey.RESPONSE_BODY_INDEX]: null,
  [ConfigKey.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.URLS]: stringToJsonFormatter,
  [ConfigKey.USERNAME]: stringToJsonFormatter,
  [ConfigKey.PASSWORD]: stringToJsonFormatter,
  [ConfigKey.PROXY_URL]: stringToJsonFormatter,
  [ConfigKey.PROXY_HEADERS]: objectToJsonFormatter,
  [ConfigKey.PORT]: stringToJsonFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_JSON_CHECK]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.RESPONSE_STATUS_CHECK]: arrayToJsonFormatter,
  [ConfigKey.REQUEST_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) =>
    fields[ConfigKey.REQUEST_BODY_CHECK]?.value
      ? JSON.stringify(fields[ConfigKey.REQUEST_BODY_CHECK]?.value)
      : null,
  [ConfigKey.RESPONSE_BODY_MAX_BYTES]: null,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
