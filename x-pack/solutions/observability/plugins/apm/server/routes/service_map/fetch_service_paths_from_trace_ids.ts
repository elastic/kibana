/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type {
  ConnectionNodeLegacy,
  ExitSpanDestinationLegacy,
} from '../../../common/service_map/types';
import {
  AGENT_NAME,
  PARENT_ID,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { calculateDocsPerShard } from './calculate_docs_per_shard';

const SCRIPTED_METRICS_FIELDS_TO_COPY = [
  PARENT_ID,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  TRACE_ID,
  PROCESSOR_EVENT,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  AGENT_NAME,
];

const AVG_BYTES_PER_FIELD = 55;

export async function fetchServicePathsFromTraceIds({
  apmEventClient,
  traceIds,
  start,
  end,
  terminateAfter,
  serviceMapMaxAllowableBytes,
  numOfRequests,
}: {
  apmEventClient: APMEventClient;
  traceIds: string[];
  start: number;
  end: number;
  terminateAfter: number;
  serviceMapMaxAllowableBytes: number;
  numOfRequests: number;
}) {
  // make sure there's a range so ES can skip shards
  const dayInMs = 24 * 60 * 60 * 1000;
  const startRange = start - dayInMs;
  const endRange = end + dayInMs;

  const serviceMapParams = {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    terminate_after: terminateAfter,
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [
          {
            terms: {
              [TRACE_ID]: traceIds,
            },
          },
          ...rangeQuery(startRange, endRange),
        ],
      },
    },
  };
  // fetch without aggs to get shard count, first
  const serviceMapQueryDataResponse = await apmEventClient.search(
    'get_trace_ids_shard_data',
    serviceMapParams
  );
  /*
   * Calculate how many docs we can fetch per shard.
   * Used in both terminate_after and tracking in the map script of the scripted_metric agg
   * to ensure we don't fetch more than we can handle.
   *
   * 1. Use serviceMapMaxAllowableBytes setting, which represents our baseline request circuit breaker limit.
   * 2. Divide by numOfRequests we fire off simultaneously to calculate bytesPerRequest.
   * 3. Divide bytesPerRequest by the average doc size to get totalNumDocsAllowed.
   * 4. Divide totalNumDocsAllowed by totalShards to get numDocsPerShardAllowed.
   * 5. Use the lesser of numDocsPerShardAllowed or terminateAfter.
   */

  const avgDocSizeInBytes = SCRIPTED_METRICS_FIELDS_TO_COPY.length * AVG_BYTES_PER_FIELD; // estimated doc size in bytes
  const totalShards = serviceMapQueryDataResponse._shards.total;

  const calculatedDocs = calculateDocsPerShard({
    serviceMapMaxAllowableBytes,
    avgDocSizeInBytes,
    totalShards,
    numOfRequests,
  });

  const numDocsPerShardAllowed = calculatedDocs > terminateAfter ? terminateAfter : calculatedDocs;

  /*
   * Any changes to init_script, map_script, combine_script and reduce_script
   * must be replicated on https://github.com/elastic/elasticsearch-serverless/blob/main/distribution/archives/src/serverless-default-settings.yml
   */
  const serviceMapAggs = {
    service_map: {
      scripted_metric: {
        params: {
          limit: numDocsPerShardAllowed,
          fieldsToCopy: SCRIPTED_METRICS_FIELDS_TO_COPY,
        },
        init_script: {
          lang: 'painless',
          source: `
            state.docCount = 0;
            state.limit = params.limit;
            state.eventsById = new HashMap();
            state.fieldsToCopy = params.fieldsToCopy;`,
        },
        map_script: {
          lang: 'painless',
          source: `
            if (state.docCount >= state.limit) {
              // Stop processing if the document limit is reached
              return; 
            }

            def id = $('span.id', null);
            if (id == null) {
              id = $('transaction.id', null);
            }

            // Ensure same event isn't processed twice
            if (id != null && !state.eventsById.containsKey(id)) {
              def copy = new HashMap();
              copy.id = id;

              for(key in state.fieldsToCopy) {
                def value = $(key, null);
                if (value != null) {
                  copy[key] = value;
                }
              }

              state.eventsById[id] = copy;
              state.docCount++;
            }
          `,
        },
        combine_script: {
          lang: 'painless',
          source: `return state;`,
        },
        reduce_script: {
          lang: 'painless',
          source: `
            def getDestination(def event) {
              def destination = new HashMap();
              destination['span.destination.service.resource'] = event['span.destination.service.resource'];
              destination['span.type'] = event['span.type'];
              destination['span.subtype'] = event['span.subtype'];
              return destination;
            }
      
            def processAndReturnEvent(def context, def eventId) {
              def pathStack = new Stack();
              def visited = new HashSet();

              def event = context.eventsById.get(eventId);

              if (event == null) {
                return null;
              }

              pathStack.push(eventId);

              // build a stack with the path from the current event to the root
              def parentId = event['parent.id'];
              while (parentId != null && !parentId.equals(eventId)) {
                def parent = context.eventsById.get(parentId);
                if (parent == null || visited.contains(parentId)) {
                  break;
                }

                pathStack.push(parentId);
                visited.add(parentId);
                parentId = parent['parent.id'];
              }

              // pop the stack starting from the root to current event to build the path
              while (!pathStack.isEmpty()) {
                def currentEventId = pathStack.pop();
                def currentEvent = context.eventsById.get(currentEventId);

                def basePath = new ArrayList();

                if (currentEvent == null || context.processedEvents.get(currentEventId) != null) {
                  continue;
                }

                def service = new HashMap();
                service['service.name'] = currentEvent['service.name'];
                service['service.environment'] = currentEvent['service.environment'];
                service['agent.name'] = currentEvent['agent.name'];

                def currentParentId = currentEvent['parent.id'];
                def parent = currentParentId != null ? context.processedEvents.get(currentParentId) : null;

                if (parent != null) {
                  // copy the path from the parent
                  basePath.addAll(parent.path);
                  // flag parent path for removal, as it has children
                  context.locationsToRemove.add(parent.path);

                  // if the parent has 'span.destination.service.resource' set, and the service is different, we've discovered a service
                  if (parent['span.destination.service.resource'] != null
                    && parent['span.destination.service.resource'] != ""
                    && (parent['service.name'] != currentEvent['service.name']
                      || parent['service.environment'] != currentEvent['service.environment'])
                  ) {
                    def parentDestination = getDestination(parent);
                    context.externalToServiceMap.put(parentDestination, service);
                  }
                }

                def lastLocation = basePath.size() > 0 ? basePath[basePath.size() - 1] : null;
                def currentLocation = service;

                // only add the current location to the path if it's different from the last one
                if (lastLocation == null || !lastLocation.equals(currentLocation)) {
                  basePath.add(currentLocation);
                }

                // if there is an outgoing span, create a new path
                if (currentEvent['span.destination.service.resource'] != null
                  && !currentEvent['span.destination.service.resource'].equals("")) {

                  def outgoingLocation = getDestination(currentEvent);
                  def outgoingPath = new ArrayList(basePath);
                  outgoingPath.add(outgoingLocation);
                  context.paths.add(outgoingPath);
                }

                currentEvent.path = basePath;
                context.processedEvents[currentEventId] = currentEvent;
              }

              return null;
            }
      
            def context = new HashMap();
      
            context.processedEvents = new HashMap();
            context.eventsById = new HashMap();
            context.paths = new HashSet();
            context.externalToServiceMap = new HashMap();
            context.locationsToRemove = new HashSet();
      
            for (state in states) {
              context.eventsById.putAll(state.eventsById);
              state.eventsById.clear();
            }

            states.clear();
            
            for (entry in context.eventsById.entrySet()) {
              processAndReturnEvent(context, entry.getKey());
            }

            context.processedEvents.clear();
            context.eventsById.clear();
      
            def response = new HashMap();
            response.paths = new HashSet();
            response.discoveredServices = new HashSet();
      
            for (foundPath in context.paths) {
              if (!context.locationsToRemove.contains(foundPath)) {
                response.paths.add(foundPath);
              }
            }

            context.locationsToRemove.clear();
            context.paths.clear();
      
            for (entry in context.externalToServiceMap.entrySet()) {
              def map = new HashMap();
              map.from = entry.getKey();
              map.to = entry.getValue();
              response.discoveredServices.add(map);
            }

            context.externalToServiceMap.clear();

            return response;
          `,
        },
      },
    } as const,
  };

  const serviceMapParamsWithAggs = {
    ...serviceMapParams,
    size: 1,
    terminate_after: numDocsPerShardAllowed,
    aggs: serviceMapAggs,
  };

  const serviceMapFromTraceIdsScriptResponse = await apmEventClient.search(
    'get_service_paths_from_trace_ids',
    serviceMapParamsWithAggs
  );

  return serviceMapFromTraceIdsScriptResponse as {
    aggregations?: {
      service_map: {
        value: {
          paths: ConnectionNodeLegacy[][];
          discoveredServices: ExitSpanDestinationLegacy[];
        };
      };
    };
  };
}
