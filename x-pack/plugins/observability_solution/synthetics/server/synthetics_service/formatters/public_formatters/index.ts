/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpFormatters, HTTPFormatMap } from './http';
import { tcpFormatters, TCPFormatMap } from './tcp';
import { icmpFormatters, ICMPFormatMap } from './icmp';
import { browserFormatters, BrowserFormatMap } from './browser';
import { commonFormatters, CommonFormatMap } from './common';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const publicFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
