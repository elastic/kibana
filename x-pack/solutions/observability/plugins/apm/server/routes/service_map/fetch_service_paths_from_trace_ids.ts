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

type QueryResult = {
  'event.id': string;
  [PARENT_ID]?: string;
} & ConnectionNode;

type Node = {
  id: string;
  children: Node[];
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
  const { hits } = await esqlClient.esql<QueryResult, { transform: 'plain' }>(
    'get_service_paths_from_trace_ids',
    {
      query: `
        FROM ${index.join(',')}
          | EVAL event.id = CASE(processor.event == "span", ${SPAN_ID}, ${TRANSACTION_ID}),
              ${SPAN_DESTINATION_SERVICE_RESOURCE} =  CONCAT(${TIMESTAMP_US}::string, "|", ${SPAN_DESTINATION_SERVICE_RESOURCE}),
              ${SPAN_SUBTYPE} =  CONCAT(${TIMESTAMP_US}::string, "|", ${SPAN_SUBTYPE}),
              ${SPAN_TYPE} =  CONCAT(${TIMESTAMP_US}::string, "|", ${SPAN_TYPE}),
              ${AGENT_NAME} = CONCAT(${TIMESTAMP_US}::string, "|", ${AGENT_NAME}),
              ${SERVICE_NAME} = CONCAT(${TIMESTAMP_US}::string, "|", ${SERVICE_NAME}),
              ${PARENT_ID} = CONCAT(${TIMESTAMP_US}::string, "|", ${PARENT_ID}),
              ${SERVICE_ENVIRONMENT} = CONCAT(${TIMESTAMP_US}::string, "|", ${SERVICE_ENVIRONMENT})
          | LIMIT ${terminateAfter}
          | STATS ${SPAN_DESTINATION_SERVICE_RESOURCE} = MAX(${SPAN_DESTINATION_SERVICE_RESOURCE}),
              ${SPAN_SUBTYPE} = MAX(${SPAN_SUBTYPE}),
              ${SPAN_TYPE} = MAX(${SPAN_TYPE}),
              ${AGENT_NAME} = MAX(${AGENT_NAME}),
              ${SERVICE_NAME} = MAX(${SERVICE_NAME}),
              ${PARENT_ID} = MAX(${PARENT_ID}),
              ${TRACE_ID} = MAX(${TRACE_ID}),
              ${SERVICE_ENVIRONMENT} = MAX(${SERVICE_ENVIRONMENT}) BY event.id
          | EVAL ${SPAN_DESTINATION_SERVICE_RESOURCE} = SPLIT(${SPAN_DESTINATION_SERVICE_RESOURCE}, "|"),
              ${SPAN_SUBTYPE} = SPLIT(${SPAN_SUBTYPE}, "|"),
              ${SPAN_TYPE} = SPLIT(${SPAN_TYPE}, "|"),
              ${AGENT_NAME} = SPLIT(${AGENT_NAME}, "|"),
              ${SERVICE_NAME} = SPLIT(${SERVICE_NAME}, "|"),
              ${PARENT_ID} = SPLIT(${PARENT_ID}, "|"),
              ${SERVICE_ENVIRONMENT} = SPLIT(${SERVICE_ENVIRONMENT}, "|")
          | EVAL 
              ${SPAN_DESTINATION_SERVICE_RESOURCE} = TO_STRING(MV_LAST(${SPAN_DESTINATION_SERVICE_RESOURCE})),
              ${SPAN_SUBTYPE} = TO_STRING(MV_LAST(${SPAN_SUBTYPE})),
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

  const eventsById = getEventsById({ response: hits });
  const entryIds = getEntryIds({ eventsById });
  const eventTrees = getEventTrees({ eventsById, entryIds });

  const { paths, discoveredServices } = buildMapPaths({ entryIds, eventTrees });

  return {
    paths,
    discoveredServices,
  };
}

const isSpan = (node: ConnectionNode): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

function getConnectionNodeId(node: ConnectionNode): string {
  if (isSpan(node)) {
    return node[SPAN_DESTINATION_SERVICE_RESOURCE];
  }
  return node[SERVICE_NAME];
}

const getServiceConnectionNode = (event: Node): ServiceConnectionNode => {
  return {
    [SERVICE_NAME]: event[SERVICE_NAME],
    [SERVICE_ENVIRONMENT]: event[SERVICE_ENVIRONMENT],
    [AGENT_NAME]: event[AGENT_NAME],
  };
};

const getExternalConnectionNode = (event: Node): ExternalConnectionNode => {
  return {
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event[SPAN_DESTINATION_SERVICE_RESOURCE],
    [SPAN_TYPE]: event[SPAN_TYPE],
    [SPAN_SUBTYPE]: event[SPAN_SUBTYPE],
  };
};

const generatePathKey = (edges: ConnectionNode[]): string => {
  const res = edges.map((edge) => getConnectionNodeId(edge)).join('|');
  return res;
};

function getEventTrees({
  eventsById,
  entryIds,
}: {
  eventsById: Map<string, Node>;
  entryIds: Set<string>;
}) {
  const eventTrees = new Map<string, Node>();
  const events = Array.from(eventsById.values());

  const visited = new Set<string>();

  const childrenByParentId = new Map<string, Node[]>();
  for (const event of events) {
    if (!event.parent) {
      continue;
    }

    const currentChildren = childrenByParentId.get(event.parent) || [];
    if (currentChildren) {
      currentChildren.push(event);
      childrenByParentId.set(event.parent, currentChildren);
    } else {
      childrenByParentId.set(event.parent, [event]);
    }
  }

  for (const entry of entryIds) {
    const treeRoot = eventsById.get(entry);
    if (!treeRoot) {
      continue;
    }

    const stack: Node[] = [treeRoot];

    while (stack.length > 0) {
      const node = stack.pop()!;

      if (visited.has(node.id)) {
        continue;
      }

      visited.add(node.id);

      const children = childrenByParentId.get(node.id) || [];
      for (const child of children) {
        if (!visited.has(child.id)) {
          stack.push(child);
          node.children.push(child);
        }
      }
    }

    eventTrees.set(treeRoot.id, treeRoot);
  }

  return eventTrees;
}

const buildMapPaths = ({
  entryIds,
  eventTrees,
}: {
  entryIds: Set<string>;
  eventTrees: Map<string, Node>;
}) => {
  const allPaths = new Map<string, ConnectionNode[]>();
  const allDiscoveredServices = new Map<string, DiscoveredService>();
  const visited = new Set<string>();

  const stack: Array<{ currentNode: Node; parentPath: ConnectionNode[]; parentNode?: Node }> = [];

  for (const entryId of entryIds) {
    const treeRoot = eventTrees.get(entryId);
    if (treeRoot) {
      stack.push({ currentNode: treeRoot, parentPath: [] });
    }

    while (stack.length > 0) {
      const { currentNode, parentPath, parentNode } = stack.pop()!;

      if (!currentNode || visited.has(currentNode.id)) {
        continue;
      }

      visited.add(currentNode.id);

      if (
        parentNode &&
        isSpan(parentNode) &&
        (parentNode[SERVICE_NAME] !== currentNode[SERVICE_NAME] ||
          parentNode[SERVICE_ENVIRONMENT] !== currentNode[SERVICE_ENVIRONMENT])
      ) {
        const pathKey = generatePathKey([parentNode, currentNode]);
        if (!allDiscoveredServices.has(pathKey)) {
          allDiscoveredServices.set(pathKey, {
            from: getExternalConnectionNode(parentNode),
            to: getServiceConnectionNode(currentNode),
          });
        }
      }

      const currentPath = [...parentPath];
      const lastEdge = currentPath.length > 0 ? currentPath[currentPath.length - 1] : undefined;

      if (
        !lastEdge ||
        !(
          lastEdge[SERVICE_NAME] === currentNode[SERVICE_NAME] &&
          lastEdge[SERVICE_ENVIRONMENT] === currentNode[SERVICE_ENVIRONMENT]
        )
      ) {
        currentPath.push(getServiceConnectionNode(currentNode));
      }

      if (isSpan(currentNode)) {
        const externalNode = getExternalConnectionNode(currentNode);
        const newPath = [...currentPath, externalNode];
        const pathKey = generatePathKey(newPath);

        if (!allPaths.has(pathKey)) {
          allPaths.set(pathKey, newPath);
        }
      }

      for (const child of currentNode.children) {
        stack.push({ currentNode: child, parentPath: currentPath, parentNode: currentNode });
      }
    }
  }

  return {
    paths: Array.from(allPaths.values()),
    discoveredServices: Array.from(allDiscoveredServices.values()),
  };
};

function getEventsById({ response }: { response: QueryResult[] }) {
  return response.reduce((acc, hit) => {
    const eventId = hit['event.id'];
    if (!acc.has(eventId)) {
      acc.set(eventId, {
        ...hit,
        id: eventId,
        parent: hit[PARENT_ID],
        [AGENT_NAME]: hit[AGENT_NAME],
        [SERVICE_NAME]: hit[SERVICE_NAME],
        [SERVICE_ENVIRONMENT]: hit[SERVICE_ENVIRONMENT],
        [SPAN_DESTINATION_SERVICE_RESOURCE]: hit[SPAN_DESTINATION_SERVICE_RESOURCE],
        [SPAN_ID]: hit[SPAN_ID],
        [SPAN_SUBTYPE]: hit[SPAN_SUBTYPE],
        children: [],
      });
    }
    return acc;
  }, new Map<string, Node>());
}

function getEntryIds({ eventsById }: { eventsById: Map<string, Node> }) {
  const entryIds = new Set<string>();

  for (const [eventId, event] of eventsById) {
    if (!event.parent) {
      entryIds.add(eventId);
    }
  }

  return entryIds;
}
