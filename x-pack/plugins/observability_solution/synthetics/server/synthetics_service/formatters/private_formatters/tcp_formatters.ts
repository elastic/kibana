/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, TCPFields } from '../../../../common/runtime_types';
import { objectToJsonFormatter } from './formatting_utils';
import { tlsFormatters } from './tls_formatters';
import { stringToJsonFormatter } from './formatting_utils';
import { commonFormatters, Formatter } from './common_formatters';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;

export const tcpFormatters: TCPFormatMap = {
  ...commonFormatters,
  ...tlsFormatters,
  [ConfigKey.METADATA]: objectToJsonFormatter,
  [ConfigKey.HOSTS]: stringToJsonFormatter,
  [ConfigKey.PROXY_USE_LOCAL_RESOLVER]: null,
  [ConfigKey.RESPONSE_RECEIVE_CHECK]: stringToJsonFormatter,
  [ConfigKey.REQUEST_SEND_CHECK]: stringToJsonFormatter,
  [ConfigKey.PROXY_URL]: stringToJsonFormatter,
  [ConfigKey.PORT]: stringToJsonFormatter,
  [ConfigKey.URLS]: stringToJsonFormatter,
  [ConfigKey.MODE]: null,
  [ConfigKey.IPV4]: null,
  [ConfigKey.IPV6]: null,
};
