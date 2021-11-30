/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPFields, ConfigKeys } from '../../fleet_package/types';
import { Formatter, commonFormatters, objectFormatter, arrayFormatter } from './common';
import { tlsFormatters } from './tls';

export type HTTPFormatMap = Record<keyof HTTPFields, Formatter>;

export const httpFormatters: HTTPFormatMap = {
  [ConfigKeys.METADATA]: (fields) => objectFormatter(fields[ConfigKeys.METADATA]),
  [ConfigKeys.URLS]: null,
  [ConfigKeys.MAX_REDIRECTS]: null,
  [ConfigKeys.USERNAME]: null,
  [ConfigKeys.PASSWORD]: null,
  [ConfigKeys.PROXY_URL]: null,
  [ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]: (fields) =>
    arrayFormatter(fields[ConfigKeys.RESPONSE_BODY_CHECK_NEGATIVE]),
  [ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]: (fields) =>
    arrayFormatter(fields[ConfigKeys.RESPONSE_BODY_CHECK_POSITIVE]),
  [ConfigKeys.RESPONSE_BODY_INDEX]: null,
  [ConfigKeys.RESPONSE_HEADERS_CHECK]: (fields) =>
    objectFormatter(fields[ConfigKeys.RESPONSE_HEADERS_CHECK]),
  [ConfigKeys.RESPONSE_HEADERS_INDEX]: null,
  [ConfigKeys.RESPONSE_STATUS_CHECK]: (fields) =>
    arrayFormatter(fields[ConfigKeys.RESPONSE_STATUS_CHECK]),
  [ConfigKeys.REQUEST_BODY_CHECK]: (fields) => fields[ConfigKeys.REQUEST_BODY_CHECK]?.value || null,
  [ConfigKeys.REQUEST_HEADERS_CHECK]: (fields) =>
    objectFormatter(fields[ConfigKeys.REQUEST_HEADERS_CHECK]),
  [ConfigKeys.REQUEST_METHOD_CHECK]: null,
  ...tlsFormatters,
  ...commonFormatters,
};
