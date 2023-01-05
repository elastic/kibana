/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INVALID_NAMESPACE_CHARACTERS } from '@kbn/fleet-plugin/common';
import { DataStream } from '../runtime_types';
import { httpFormatters, HTTPFormatMap } from './http/formatters';
import { tcpFormatters, TCPFormatMap } from './tcp/formatters';
import { icmpFormatters, ICMPFormatMap } from './icmp/formatters';
import { browserFormatters, BrowserFormatMap } from './browser/formatters';
import { commonFormatters, CommonFormatMap } from './common/formatters';

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

/* Formats kibana space id into a valid Fleet-compliant datastream namespace */
export const formatKibanaNamespace = (spaceId: string) => {
  const namespaceRegExp = new RegExp(INVALID_NAMESPACE_CHARACTERS, 'g');
  const kibanaNamespace = spaceId.replace(namespaceRegExp, '_');
  return kibanaNamespace;
};
