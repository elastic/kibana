/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_ID,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TIMESTAMP_US,
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../common/es_fields/apm';
import type {
  ConnectionNode,
  DiscoveredService,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import type { EsClient } from '../../lib/helpers/get_esql_client';

type QueryReturnType = {
  'event.id': string;
  [PARENT_ID]?: string;
} & ConnectionNode;

export async function fetchServicePathsFromTraceIds({
  traceIds,
  start,
  end,
  index,
  filters,
  esqlClient,
  terminateAfter,
}: {
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  esqlClient: EsClient;
  index: string[];
  filters: QueryDslQueryContainer[];
}) {
  // The query does the following:
  // 1. Gets the latest field values for each event.id
  //  Due to the  lack of esql native aggregation to get the latest value of a field,
  //  we use the EVAL function to create a new field that is a concatenation of the timestamp and the value of the field we want to get the latest value of.
  //  We then use the STATS function to get the latest value of the field by trace ID, event ID, event name, and service name.
  // 2. Groups the events by their ID (either span or transaction ID)
  const { hits } = await esqlClient.esql<QueryReturnType, { transform: 'plain' }>(
    'get_service_paths_from_trace_ids',
    {
      query: `
        FROM ${index.join(',')}
          | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID}),
              ${SPAN_SUBTYPE} =  CONCAT(${TIMESTAMP_US}::string, ":", ${SPAN_SUBTYPE}),
              ${SPAN_TYPE} =  CONCAT(${TIMESTAMP_US}::string, ":", ${SPAN_TYPE}),
              ${AGENT_NAME} = CONCAT(${TIMESTAMP_US}::string, ":", ${AGENT_NAME}),
              ${SERVICE_NAME} = CONCAT(${TIMESTAMP_US}::string, ":", ${SERVICE_NAME}),
              ${PARENT_ID} = CONCAT(${TIMESTAMP_US}::string, ":", ${PARENT_ID}),
              ${SERVICE_ENVIRONMENT} = CONCAT(${TIMESTAMP_US}::string, ":", ${SERVICE_ENVIRONMENT})
          | LIMIT ${terminateAfter}
          | STATS ${SPAN_DESTINATION_SERVICE_RESOURCE} = MAX(${SPAN_DESTINATION_SERVICE_RESOURCE}),
              ${SPAN_SUBTYPE} = MAX(${SPAN_SUBTYPE}),
              ${SPAN_TYPE} = MAX(${SPAN_TYPE}),
              ${AGENT_NAME} = MAX(${AGENT_NAME}),
              ${SERVICE_NAME} = MAX(${SERVICE_NAME}),
              ${PARENT_ID} = MAX(${PARENT_ID}),
              ${TRACE_ID} = MAX(${TRACE_ID}),
              ${SERVICE_ENVIRONMENT} = MAX(${SERVICE_ENVIRONMENT}) BY event.id
          | EVAL ${SPAN_SUBTYPE} = SPLIT(${SPAN_SUBTYPE}, ":"),
              ${SPAN_TYPE} = SPLIT(${SPAN_TYPE}, ":"),
              ${AGENT_NAME} = SPLIT(${AGENT_NAME}, ":"),
              ${SERVICE_NAME} = SPLIT(${SERVICE_NAME}, ":"),
              ${PARENT_ID} = SPLIT(${PARENT_ID}, ":"),
              ${SERVICE_ENVIRONMENT} = SPLIT(${SERVICE_ENVIRONMENT}, ":")
          | EVAL ${SPAN_SUBTYPE} = TO_STRING(MV_LAST(${SPAN_SUBTYPE})),
              ${SPAN_TYPE} = TO_STRING(MV_LAST(${SPAN_TYPE})),
              ${AGENT_NAME} = TO_STRING(MV_LAST(${AGENT_NAME})),
              ${SERVICE_NAME} = TO_STRING(MV_LAST(${SERVICE_NAME})),
              ${PARENT_ID} = TO_STRING(MV_LAST(${PARENT_ID})),
              ${SERVICE_ENVIRONMENT} = TO_STRING(MV_LAST(${SERVICE_ENVIRONMENT}))
      `,
      filter: {
        bool: {
          filter: [...rangeQuery(start, end), ...termsQuery(TRACE_ID, ...traceIds), ...filters],
        },
      },
    },
    { transform: 'plain' }
  );

  const eventsById = hits.reduce((acc, hit) => {
    const eventId = hit['event.id'];
    if (!acc[eventId]) {
      acc[eventId] = hit;
    }
    return acc;
  }, {} as Record<string, QueryReturnType>);

  const { paths, discoveredServices } = buildAllPaths(eventsById);

  return {
    aggregations: {
      service_map: {
        value: {
          paths,
          discoveredServices: Array.from(discoveredServices.values()),
        },
      },
    },
  } as {
    aggregations?: {
      service_map: {
        value: {
          paths: ConnectionNode[][];
          discoveredServices: DiscoveredService[];
        };
      };
    };
  };
}

const getAllEventIds = (eventsById: Record<string, QueryReturnType>) => {
  return new Set([
    ...Object.keys(eventsById),
    ...Object.values(eventsById)
      .map((event) => event[PARENT_ID])
      .filter((parentId): parentId is string => !!parentId),
  ]);
};

const isSpan = (node: ConnectionNode): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

function getConnectionNodeId(node: ConnectionNode): string {
  if (isSpan(node)) {
    return node[SPAN_DESTINATION_SERVICE_RESOURCE];
  }
  return node[SERVICE_NAME];
}

const getServiceConnectionNode = (event: ConnectionNode): ServiceConnectionNode => {
  return {
    [SERVICE_NAME]: event[SERVICE_NAME],
    [SERVICE_ENVIRONMENT]: event[SERVICE_ENVIRONMENT],
    [AGENT_NAME]: event[AGENT_NAME],
  };
};

const getExternalConnectionNode = (event: ConnectionNode): ExternalConnectionNode => {
  return {
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event[SPAN_DESTINATION_SERVICE_RESOURCE],
    [SPAN_TYPE]: event[SPAN_TYPE],
    [SPAN_SUBTYPE]: event[SPAN_SUBTYPE],
  };
};

type Node = {
  edges: ConnectionNode[];
} & QueryReturnType;

const generatePathKey = (edges: ConnectionNode[]): string => {
  const res = edges.map((edge) => getConnectionNodeId(edge)).join('|');
  return res;
};

const buildEventPath = (
  startEventId: string,
  eventsById: Record<string, QueryReturnType>,
  processedEvents = new Map<string, Node>()
) => {
  const stack: string[] = [startEventId];
  const reprocessQueue = new Set<string>();

  const allPaths = new Map<string, ConnectionNode[]>();
  const allDiscoveredServices = new Map<string, DiscoveredService>();

  const visited = new Set<string>();

  while (stack.length > 0) {
    const eventId = stack.pop()!;

    const currentEvent = eventsById[eventId];

    if (!currentEvent || processedEvents.has(eventId)) {
      continue;
    }

    visited.add(eventId);

    const parentId = currentEvent[PARENT_ID];
    const processedParent = parentId ? processedEvents.get(parentId) : undefined;

    if (parentId && !processedParent && !visited.has(parentId)) {
      stack.push(parentId);
      reprocessQueue.add(eventId);

      continue;
    }

    if (
      processedParent &&
      isSpan(processedParent) &&
      (processedParent[SERVICE_NAME] !== currentEvent[SERVICE_NAME] ||
        processedParent[SERVICE_ENVIRONMENT] !== currentEvent[SERVICE_ENVIRONMENT])
    ) {
      const pathKey = generatePathKey([processedParent, currentEvent]);
      if (!allDiscoveredServices.has(pathKey)) {
        allDiscoveredServices.set(pathKey, {
          from: getExternalConnectionNode(processedParent),
          to: getServiceConnectionNode(currentEvent),
        });
      }
    }

    const edges = [...(processedParent?.edges || [])];
    const lastEdge = edges.length > 0 ? edges[edges.length - 1] : undefined;

    if (
      !lastEdge ||
      !(
        lastEdge[SERVICE_NAME] === currentEvent[SERVICE_NAME] &&
        lastEdge[SERVICE_ENVIRONMENT] === currentEvent[SERVICE_ENVIRONMENT]
      )
    ) {
      edges.push(getServiceConnectionNode(currentEvent));
    }

    if (isSpan(currentEvent)) {
      const externalNode = getExternalConnectionNode(currentEvent);
      const newNodes = [...edges, externalNode];
      const pathKey = generatePathKey(newNodes);

      if (!allPaths.has(pathKey)) {
        allPaths.set(pathKey, newNodes);
      }
    }

    processedEvents.set(eventId, { edges, ...currentEvent });

    if (reprocessQueue.size > 0) {
      stack.push(...reprocessQueue);
      reprocessQueue.clear();
    }

    visited.delete(eventId);
  }

  return {
    paths: [...allPaths.values()].filter((path) => path.length > 1),
    discoveredServices: [...allDiscoveredServices.values()],
  };
};

const buildAllPaths = (eventsById: Record<string, QueryReturnType>) => {
  const allDiscoveredServices: DiscoveredService[] = [];
  const allEventIds = getAllEventIds(eventsById);
  const allPaths: ConnectionNode[][] = [];

  const processedEvents = new Map<string, Node>();

  for (const eventId of allEventIds) {
    const { discoveredServices, paths } = buildEventPath(eventId, eventsById, processedEvents);
    allPaths.push(...paths);
    allDiscoveredServices.push(...discoveredServices);
  }

  return {
    paths: allPaths,
    discoveredServices: allDiscoveredServices,
  };
};
