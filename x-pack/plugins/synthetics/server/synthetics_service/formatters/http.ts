/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpFormatters as basicHttpFormatters } from '../../../common/formatters/http/formatters';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { ConfigKey, HTTPFields } from '../../../common/runtime_types/monitor_management';
import { arrayFormatter, objectFormatter } from './formatting_utils';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;
export const httpFormatters: HTTPFormatMap = {
  ...basicHttpFormatters,
  [ConfigKey.METADATA]: objectFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_NEGATIVE]: arrayFormatter,
  [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: arrayFormatter,
  [ConfigKey.RESPONSE_JSON_CHECK]: arrayFormatter,
  [ConfigKey.RESPONSE_HEADERS_CHECK]: objectFormatter,
  [ConfigKey.RESPONSE_STATUS_CHECK]: arrayFormatter,
  [ConfigKey.REQUEST_HEADERS_CHECK]: objectFormatter,
  [ConfigKey.REQUEST_BODY_CHECK]: (fields) => fields[ConfigKey.REQUEST_BODY_CHECK]?.value || null,
  [ConfigKey.PROXY_HEADERS]: objectFormatter,
  ...tlsFormatters,
  ...commonFormatters,
};
