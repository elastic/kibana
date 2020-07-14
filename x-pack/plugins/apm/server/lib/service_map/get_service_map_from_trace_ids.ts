/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { find, uniqBy } from 'lodash';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import {
  Connection,
  ConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import { Setup } from '../helpers/setup_request';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

export function getConnections(
  paths?: ConnectionNode[][],
  serviceName?: string,
  environment?: string
) {
  if (!paths) {
    return [];
  }

  if (serviceName || environment) {
    paths = paths.filter((path) => {
      return path.some((node) => {
        let matches = true;
        if (serviceName) {
          matches =
            matches &&
            SERVICE_NAME in node &&
            (node as ServiceConnectionNode)[SERVICE_NAME] === serviceName;
        }
        if (environment) {
          matches =
            matches &&
            SERVICE_ENVIRONMENT in node &&
            (node as ServiceConnectionNode)[SERVICE_ENVIRONMENT] ===
              environment;
        }
        return matches;
      });
    });
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
  serviceName,
  environment,
}: {
  setup: Setup;
  traceIds: string[];
  serviceName?: string;
  environment?: string;
}) {
  const serviceMapFromTraceIdsScriptResponse = await fetchServicePathsFromTraceIds(
    setup,
    traceIds
  );

  const serviceMapScriptedAggValue =
    serviceMapFromTraceIdsScriptResponse.aggregations?.service_map.value;

  return {
    connections: getConnections(
      serviceMapScriptedAggValue?.paths,
      serviceName,
      environment
    ),
    discoveredServices: serviceMapScriptedAggValue?.discoveredServices ?? [],
  };
}
