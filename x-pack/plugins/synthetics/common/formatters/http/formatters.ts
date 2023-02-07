/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tlsFormatters } from '../tls/formatters';
import { HTTPFields, ConfigKey } from '../../runtime_types/monitor_management';

import { Formatter, commonFormatters } from '../common/formatters';
import { arrayToJsonFormatter, objectToJsonFormatter } from '../formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

export const httpFormatters: HTTPFormatMap = {
  [ConfigKey.MAX_REDIRECTS]: null,
  [ConfigKey.REQUEST_METHOD_CHECK]: null,
  [ConfigKey.RESPONSE_BODY_INDEX]: null,
  [ConfigKey.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.URLS]: null,
  [ConfigKey.USERNAME]: null,
  [ConfigKey.PASSWORD]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: arrayToJsonFormatter,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.RESPONSE_STATUS_CHECK]: arrayToJsonFormatter,
  [ConfigKey.REQUEST_HEADERS_CHECK]: objectToJsonFormatter,
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) =>
    fields[ConfigKey.REQUEST_BODY_CHECK]?.value
      ? JSON.stringify(fields[ConfigKey.REQUEST_BODY_CHECK]?.value)
      : null,
  ...tlsFormatters,
  ...commonFormatters,
};
