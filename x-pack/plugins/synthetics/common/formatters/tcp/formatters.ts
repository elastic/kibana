/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TCPFields, ConfigKey } from '../../runtime_types/monitor_management';

import { Formatter, commonFormatters } from '../common/formatters';
import { objectToJsonFormatter } from '../formatting_utils';
import { tlsFormatters } from '../tls/formatters';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;

export const tcpFormatters: TCPFormatMap = {
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.HOSTS]: null,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: null,
  [ConfigKey.REQUEST_SEND_CHECK]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.URLS]: null,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
  ...tlsFormatters,
  ...commonFormatters,
};
