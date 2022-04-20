/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Formatter, commonFormatters, objectFormatter, arrayFormatter } from './common';
import { tlsFormatters } from './tls';
import { ConfigKey, HTTPFields } from '../../../../common/runtime_types/monitor_management';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

export const httpFormatters: HTTPFormatMap = {
  [ConfigKey.METADATA]: (fields) => objectFormatter(fields[ConfigKey.METADATA]),
  [ConfigKey.URLS]: null,
  [ConfigKey.MAX_REDIRECTS]: null,
  [ConfigKey.USERNAME]: null,
  [ConfigKey.PASSWORD]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: (fields) =>
    arrayFormatter(fields[ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]),
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: (fields) =>
    arrayFormatter(fields[ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]),
  [ConfigKey.RESPONSE_BODY_INDEX]: null,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: (fields) =>
    objectFormatter(fields[ConfigKey.RESPONSE_HEADERS_CHECK]),
  [ConfigKey.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKey.RESPONSE_STATUS_CHECK]: (fields) =>
    arrayFormatter(fields[ConfigKey.RESPONSE_STATUS_CHECK]),
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) => fields[ConfigKey.REQUEST_BODY_CHECK]?.value || null,
  [ConfigKey.REQUEST_HEADERS_CHECK]: (fields) =>
    objectFormatter(fields[ConfigKey.REQUEST_HEADERS_CHECK]),
  [ConfigKey.REQUEST_METHOD_CHECK]: null,
  ...tlsFormatters,
  ...commonFormatters,
};
