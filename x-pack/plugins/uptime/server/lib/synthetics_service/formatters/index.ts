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
import { DataStream, MonitorFields } from '../../../../common/runtime_types/monitor_management';

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

export const formatUIConfigtoDataStreamConfig = (monAttrs: MonitorFields) => {
  // TODO: Move to dedicated formatter class
  function parseSchedule(schedule: any) {
    if (schedule?.number) {
      return `@every ${schedule.number}${schedule.unit}`;
    }
    return schedule;
  }

  function parseUrl(urls?: string | string[]) {
    if (!urls) {
      return undefined;
    }
    if (urls instanceof Array) {
      return urls;
    }
    return [urls];
  }

  function parseInlineSource(monAttrs: any) {
    if (monAttrs['source.inline.script']) {
      return {
        inline: {
          script: monAttrs['source.inline.script'],
        },
      };
    }
  }

  const { id, schedule, type, name, locations, tags, urls } = monAttrs;
  return {
    id,
    type,
    name,
    locations,
    tags,
    source: parseInlineSource(monAttrs),
    urls: parseUrl(urls),
    schedule: parseSchedule(schedule),
  };
};
