/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TCPFields, ConfigKeys } from '../../fleet_package/types';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;

export const tcpFormatters: TCPFormatMap = {
  [ConfigKeys.METADATA]: null,
  [ConfigKeys.HOSTS]: null,
  [ConfigKeys.PROXY_URL]: null,
  [ConfigKeys.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKeys.RESPONSE_RECEIVE_CHECK]: null,
  [ConfigKeys.REQUEST_SEND_CHECK]: null,
  ...tlsFormatters,
  ...commonFormatters,
};
