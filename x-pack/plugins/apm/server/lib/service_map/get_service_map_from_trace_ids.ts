/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { find, uniqBy } from 'lodash';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { Connection, ConnectionNode } from '../../../common/service_map';
import { Setup } from '../helpers/setup_request';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';

export function getConnections({
  paths,
  serviceName,
  environment,
}: {
  paths: ConnectionNode[][] | undefined;
  serviceName: string | undefined;
  environment: string | undefined;
}) {
  if (!paths) {
    return [];
  }

  if (serviceName || environment) {
    paths = paths.filter((path) => {
      return (
        path
          // Only apply the filter on node that contains service name, this filters out external nodes
          .filter((node) => {
            return node[SERVICE_NAME];
          })
          .some((node) => {
            if (serviceName && node[SERVICE_NAME] !== serviceName) {
              return false;
            }

            if (!environment) {
              return true;
            }

            if (environment === ENVIRONMENT_NOT_DEFINED.value) {
              return !node[SERVICE_ENVIRONMENT];
            }

            return node[SERVICE_ENVIRONMENT] === environment;
          })
      );
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
    connections: getConnections({
      paths: serviceMapScriptedAggValue?.paths,
      serviceName,
      environment,
    }),
    discoveredServices: serviceMapScriptedAggValue?.discoveredServices ?? [],
  };
}
