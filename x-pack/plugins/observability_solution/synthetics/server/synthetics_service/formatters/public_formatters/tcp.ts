/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, TCPFields } from '../../../../common/runtime_types';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;
export const tcpFormatters: TCPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  [ConfigKey.HOSTS]: null,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: null,
  [ConfigKey.REQUEST_SEND_CHECK]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PORT]: null,
  [ConfigKey.URLS]: null,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
  [ConfigKey.METADATA]: null,
};
