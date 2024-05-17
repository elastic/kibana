/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BrowserFormatMap, browserFormatters } from './browser';
import { CommonFormatMap, commonFormatters } from './common';
import { HTTPFormatMap, httpFormatters } from './http';
import { ICMPFormatMap, icmpFormatters } from './icmp';
import { TCPFormatMap, tcpFormatters } from './tcp';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const publicFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
