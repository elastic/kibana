/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, uniqBy } from 'lodash';
import { Connection, ConnectionNode } from '../../../common/service_map';
import { Setup } from '../../lib/helpers/setup_request';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

export function getConnections({
  paths,
}: {
  paths: ConnectionNode[][] | undefined;
}) {
  if (!paths) {
    return [];
  }

  const connectionsArr = paths.flatMap((path) => {
    return path.reduce((conns, location, index) => {
      const prev = path[index - 1];
      if (prev) {
        return conns.concat({
          source: prev,
          destination: location,
        });
      }
      return conns;
    }, [] as Connection[]);
  }, [] as Connection[]);

  const connections = uniqBy(connectionsArr, (value) =>
    find(connectionsArr, value)
  );

  return connections;
}

export async function getServiceMapFromTraceIds({
  setup,
  traceIds,
  start,
  end,
}: {
  setup: Setup;
  traceIds: string[];
  start: number;
  end: number;
}) {
  const serviceMapFromTraceIdsScriptResponse =
    await fetchServicePathsFromTraceIds(setup, traceIds, start, end);

  const serviceMapScriptedAggValue =
    serviceMapFromTraceIdsScriptResponse.aggregations?.service_map.value;

  return {
    connections: getConnections({
      paths: serviceMapScriptedAggValue?.paths,
    }),
    discoveredServices: serviceMapScriptedAggValue?.discoveredServices ?? [],
  };
}
