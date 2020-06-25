/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraClientCoreSetup } from '../types';

// TODO: this satisfies a TS error because TS inference assumed the stat type was just "string",
// but we need a better solution for this 🤔
type StatType = 'number' | 'percent' | 'bytesPerSecond';

export function getLogsHasDataFetcher(getStartServices: InfraClientCoreSetup['getStartServices']) {
  return async () => {
    const [, startPlugins] = await getStartServices();
    const { data } = startPlugins;
    // perform query
    return true;
  };
}

export function getLogsOverviewDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
) {
  return async () => {
    const [, startPlugins] = await getStartServices();
    const { data } = startPlugins;

    // perform query
    return {
      title: 'Log rate',
      appLink: 'TBD', // TODO: what format should this be in, relative I assume?
      stats: {
        nginx: {
          type: 'number' as StatType, // TODO: this casting is a hack, we need to fix
          label: 'nginx',
          value: 345341,
        },
        'elasticsearch.audit': {
          type: 'number' as StatType,
          label: 'elasticsearch.audit',
          value: 164929,
        },
        'haproxy.log': {
          type: 'number' as StatType,
          label: 'haproxy.log',
          value: 51101,
        },
      },
      // Note: My understanding is that these series coordinates will be
      // combined into objects that look like:
      // { x: timestamp, y: value, g: label (e.g. nginx) }
      // so they fit the stacked bar chart API
      // https://elastic.github.io/elastic-charts/?path=/story/bar-chart--stacked-with-axis-and-legend
      series: {
        nginx: {
          label: 'nginx',
          coordinates: [
            { x: '2020-06-24T12:00:00.000Z', y: 10014 },
            { x: '2020-06-24T12:15:00.000Z', y: 12827 },
            { x: '2020-06-24T12:30:00.000Z', y: 2946 },
            { x: '2020-06-24T12:45:00.000Z', y: 14298 },
            { x: '2020-06-24T13:00:00.000Z', y: 4096 },
          ],
        },
        'elasticsearch.audit': {
          label: 'elasticsearch.audit',
          coordinates: [
            { x: '2020-06-24T12:00:00.000Z', y: 5676 },
            { x: '2020-06-24T12:15:00.000Z', y: 6783 },
            { x: '2020-06-24T12:30:00.000Z', y: 2394 },
            { x: '2020-06-24T12:45:00.000Z', y: 4554 },
            { x: '2020-06-24T13:00:00.000Z', y: 5659 },
          ],
        },
        'haproxy.log': {
          label: 'haproxy.log',
          coordinates: [
            { x: '2020-06-24T12:00:00.000Z', y: 9085 },
            { x: '2020-06-24T12:15:00.000Z', y: 9002 },
            { x: '2020-06-24T12:30:00.000Z', y: 3940 },
            { x: '2020-06-24T12:45:00.000Z', y: 5451 },
            { x: '2020-06-24T13:00:00.000Z', y: 9133 },
          ],
        },
      },
    };
  };
}
