/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import d3 from 'd3';
import { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { getTimezoneOffsetInMs } from './get_timezone_offset_in_ms';

interface Params {
  domain: [number, number];
  totalTicks: number;
  width: number;
}

export const getTimeTicksTZ = ({ domain, totalTicks, width }: Params) =>
  d3.time.scale
    .utc()
    .domain(domain)
    .range([0, width])
    .ticks(totalTicks)
    .map((x) => {
      const time = x.getTime();
      return new Date(time + getTimezoneOffsetInMs(time));
    });

export const getDomainTZ = (min: number, max: number): [number, number] => {
  const [xMinZone, xMaxZone] = [min, max].map(
    (time) => time - getTimezoneOffsetInMs(time)
  );
  return [xMinZone, xMaxZone];
};

export function getTimeZone(uiSettings?: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings?.get<'Browser' | string>(
    UI_SETTINGS.DATEFORMAT_TZ
  );

  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return 'local';
  }

  return kibanaTimeZone;
}
