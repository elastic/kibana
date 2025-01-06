/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getRequestBase } from '@kbn/apm-data-access-plugin/server/lib/helpers/create_es_client/create_apm_event_client/get_request_base';
import {
  AGENT_NAME,
  PARENT_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import type {
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { EsClient } from '../../lib/helpers/get_esql_client';

type QueryReturnType = {
  'event.id': string;
  'parent.id'?: string;
} & ConnectionNode;

interface DiscoverService {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export async function fetchServicePathsFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
  terminateAfter,
  serviceMapMaxAllowableBytes,
  numOfRequests,
  esqlClient,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  serviceMapMaxAllowableBytes: number;
  numOfRequests: number;
  esqlClient: EsClient;
}) {
  const { index, filters } = getRequestBase({
    apm: { events: [ProcessorEvent.span, ProcessorEvent.transaction] },
    indices: esqlClient.indices,
  });

  const { hits } = await esqlClient.esql<QueryReturnType, { transform: 'plain' }>(
    'get_service_paths_from_trace_ids',
    {
      query: `
        FROM ${index}
        | EVAL event.id = COALESCE(span.id, transaction.id)
        | KEEP event.id, parent.id, agent.name, service.name, service.environment, span.destination.service.resource, span.type, span.subtype
        | LIMIT 10000
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
      acc[eventId] = {
        'event.id': eventId,
        'parent.id': hit[PARENT_ID],
        serviceName: hit[SERVICE_NAME],
        serviceEnvironment: hit[SERVICE_ENVIRONMENT],
        agentName: hit[AGENT_NAME],
        spanDestinationServiceResource: hit[SPAN_DESTINATION_SERVICE_RESOURCE],
        spanType: hit[SPAN_TYPE],
        spanSubtype: hit[SPAN_SUBTYPE],
      };
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
          discoveredServices: DiscoverService[];
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
  return !!(node as ExternalConnectionNode).spanDestinationServiceResource;
};

function getConnectionNodeId(node: ConnectionNode): string {
  if (isSpan(node)) {
    return node.spanDestinationServiceResource;
  }
  return node.serviceName;
}

const getServiceConnectionNode = (event: ConnectionNode): ServiceConnectionNode => {
  const { serviceName, serviceEnvironment, agentName } = event;
  return {
    serviceName,
    serviceEnvironment,
    agentName,
  };
};

const getExternalConnectionNode = (event: ConnectionNode): ExternalConnectionNode => {
  const {
    spanDestinationServiceResource: spanDestinationSericeResource,
    spanType,
    spanSubtype,
  } = event;
  return {
    spanDestinationServiceResource: spanDestinationSericeResource,
    spanType,
    spanSubtype,
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
  visitedEvents = new Map<string, Node>()
) => {
  const stack: string[] = [startEventId];
  const reprocessQueue: string[] = [];

  const allPaths = new Map<string, ConnectionNode[]>();
  const allDiscoveredServices = new Map<string, DiscoverService>();

  while (stack.length > 0) {
    const eventId = stack.pop()!;
    const currentEvent = eventsById[eventId];

    if (!currentEvent || visitedEvents.has(eventId)) {
      continue;
    }

    const parentId = currentEvent[PARENT_ID];
    const processedParent = parentId ? visitedEvents.get(parentId) : undefined;

    if (parentId && !processedParent) {
      stack.push(parentId);
      reprocessQueue.push(eventId);
      continue;
    }

    if (
      processedParent &&
      isSpan(processedParent) &&
      (processedParent.serviceName !== currentEvent.serviceName ||
        processedParent.serviceEnvironment !== currentEvent.serviceEnvironment)
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
        lastEdge.serviceName === currentEvent.serviceName &&
        lastEdge.serviceEnvironment === currentEvent.serviceEnvironment
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

    visitedEvents.set(eventId, { edges, ...currentEvent });

    if (reprocessQueue.length > 0) {
      stack.push(...reprocessQueue);
      reprocessQueue.length = 0;
    }
  }

  return {
    paths: [...allPaths.values()].filter((path) => path.length > 1),
    discoveredServices: [...allDiscoveredServices.values()],
  };
};

const buildAllPaths = (eventsById: Record<string, QueryReturnType>) => {
  const allDiscoveredServices: DiscoverService[] = [];
  const allEventIds = getAllEventIds(eventsById);
  const allPaths: ConnectionNode[][] = [];

  const visitedEvents = new Map<string, Node>();

  for (const eventId of allEventIds) {
    const { discoveredServices, paths } = buildEventPath(eventId, eventsById, visitedEvents);
    allPaths.push(...paths);
    allDiscoveredServices.push(...discoveredServices);
  }

  return {
    paths: allPaths,
    discoveredServices: allDiscoveredServices,
  };
};
