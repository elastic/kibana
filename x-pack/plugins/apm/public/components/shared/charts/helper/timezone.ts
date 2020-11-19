/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import d3 from 'd3';
import { getTimezoneOffsetInMs } from '../CustomPlot/getTimezoneOffsetInMs';

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
