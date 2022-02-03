/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { ConfigKey, TCPFields } from '../../../../common/runtime_types/monitor_management';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;

export const tcpFormatters: TCPFormatMap = {
  [ConfigKey.METADATA]: null,
  [ConfigKey.HOSTS]: null,
  [ConfigKey.PROXY_URL]: null,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: null,
  [ConfigKey.REQUEST_SEND_CHECK]: null,
  ...tlsFormatters,
  ...commonFormatters,
};
