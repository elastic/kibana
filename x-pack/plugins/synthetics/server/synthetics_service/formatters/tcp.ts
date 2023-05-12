/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tcpFormatters as baicTCPFormatters } from '../../../common/formatters/tcp/formatters';
import { Formatter, commonFormatters } from './common';
import { tlsFormatters } from './tls';
import { ConfigKey, TCPFields } from '../../../common/runtime_types/monitor_management';

export type TCPFormatMap = Record<keyof TCPFields, Formatter>;
export const tcpFormatters: TCPFormatMap = {
  ...tlsFormatters,
  ...commonFormatters,
  ...baicTCPFormatters,
  [ConfigKey.METADATA]: null,
};
