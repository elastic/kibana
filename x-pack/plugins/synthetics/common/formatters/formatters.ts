/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { INVALID_NAMESPACE_CHARACTERS } from '@kbn/fleet-plugin/common';
import { HTTPFormatMap, httpFormatters } from './http/formatters';
import { TCPFormatMap, tcpFormatters } from './tcp/formatters';
import { ICMPFormatMap, icmpFormatters } from './icmp/formatters';
import { BrowserFormatMap, browserFormatters } from './browser/formatters';
import { CommonFormatMap, commonFormatters } from './common/formatters';

type Formatters = HTTPFormatMap & TCPFormatMap & ICMPFormatMap & BrowserFormatMap & CommonFormatMap;

export const syntheticsPolicyFormatters: Formatters = {
  ...httpFormatters,
  ...icmpFormatters,
  ...tcpFormatters,
  ...browserFormatters,
  ...commonFormatters,
};

/* Formats kibana space id into a valid Fleet-compliant datastream namespace */
export const formatKibanaNamespace = (spaceId: string) => {
  const namespaceRegExp = new RegExp(INVALID_NAMESPACE_CHARACTERS, 'g');
  return spaceId.replace(namespaceRegExp, '_');
};
