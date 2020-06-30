/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraClientCoreSetup } from '../types';
import { LogsFetchDataResponse } from '../../../observability/public';

export function getLogsHasDataFetcher(getStartServices: InfraClientCoreSetup['getStartServices']) {
  return async () => {
    // if you need the data plugin, this is how you get it
    // const [, startPlugins] = await getStartServices();
    // const { data } = startPlugins;

    // if you need a core dep, we need to pass in more than just getStartServices

    // perform query
    return true;
  };
}

export function getLogsOverviewDataFetcher(
  getStartServices: InfraClientCoreSetup['getStartServices']
) {
  return async (): Promise<LogsFetchDataResponse> => {
    // if you need the data plugin, this is how you get it
    // const [, startPlugins] = await getStartServices();
    // const { data } = startPlugins;

    // if you need a core dep, we need to pass in more than just getStartServices

    // perform query
    return {
      title: 'Log rate',
      appLink: 'TBD', // TODO: what format should this be in, relative I assume?
      stats: {
        nginx: {
          type: 'number',
          label: 'nginx',
          value: 345341,
        },
        'elasticsearch.audit': {
          type: 'number',
          label: 'elasticsearch.audit',
          value: 164929,
        },
        'haproxy.log': {
          type: 'number',
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
            { x: 1593000000000, y: 10014 },
            { x: 1593000900000, y: 12827 },
            { x: 1593001800000, y: 2946 },
            { x: 1593002700000, y: 14298 },
            { x: 1593003600000, y: 4096 },
          ],
        },
        'elasticsearch.audit': {
          label: 'elasticsearch.audit',
          coordinates: [
            { x: 1593000000000, y: 5676 },
            { x: 1593000900000, y: 6783 },
            { x: 1593001800000, y: 2394 },
            { x: 1593002700000, y: 4554 },
            { x: 1593003600000, y: 5659 },
          ],
        },
        'haproxy.log': {
          label: 'haproxy.log',
          coordinates: [
            { x: 1593000000000, y: 9085 },
            { x: 1593000900000, y: 9002 },
            { x: 1593001800000, y: 3940 },
            { x: 1593002700000, y: 5451 },
            { x: 1593003600000, y: 9133 },
          ],
        },
      },
    };
  };
}
