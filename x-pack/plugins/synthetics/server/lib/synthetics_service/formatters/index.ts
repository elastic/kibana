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
import { DataStream } from '../../../../common/runtime_types';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

interface FormatterMap {
  [DataStream.HTTP]: HTTPFormatMap;
  [DataStream.ICMP]: ICMPFormatMap;
  [DataStream.TCP]: TCPFormatMap;
  [DataStream.BROWSER]: BrowserFormatMap;
}

export const formattersMap: FormatterMap = {
  [DataStream.HTTP]: httpFormatters,
  [DataStream.ICMP]: icmpFormatters,
  [DataStream.TCP]: tcpFormatters,
  [DataStream.BROWSER]: browserFormatters,
};

export const formatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};
