/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
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
import {
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from '../../../common/service_map';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
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
    body: {
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
              def stack = new Stack();
              def reprocessQueue = new LinkedList();

              // Avoid reprocessing the same event
              def visited = new HashSet();

              stack.push(eventId);

              while (!stack.isEmpty()) {
                def currentEventId = stack.pop();
                def event = context.eventsById.get(currentEventId);

                if (event == null || context.processedEvents.get(currentEventId) != null) {
                  continue;
                }
                visited.add(currentEventId);

                def service = new HashMap();
                service['service.name'] = event['service.name'];
                service['service.environment'] = event['service.environment'];
                service['agent.name'] = event['agent.name'];
                
                def basePath = new ArrayList();
                def parentId = event['parent.id'];

                if (parentId != null && !parentId.equals(currentEventId)) {
                  def parent = context.processedEvents.get(parentId);
                  
                  if (parent == null) {
                    
                    // Only adds the parentId to the stack if it hasn't been visited to prevent infinite loop scenarios
                    // if the parent is null, it means it hasn't been processed yet or it could also mean that the current event
                    // doesn't have a parent, in which case we should skip it
                    if (!visited.contains(parentId)) {
                      stack.push(parentId);
                      // Add currentEventId to be reprocessed once its parent is processed
                      reprocessQueue.add(currentEventId); 
                    }


                    continue;
                  }

                  // copy the path from the parent
                  basePath.addAll(parent.path);
                  // flag parent path for removal, as it has children
                  context.locationsToRemove.add(parent.path);
      
                  // if the parent has 'span.destination.service.resource' set, and the service is different, we've discovered a service
                  if (parent['span.destination.service.resource'] != null
                    && !parent['span.destination.service.resource'].equals("")
                    && (!parent['service.name'].equals(event['service.name'])
                      || !parent['service.environment'].equals(event['service.environment'])
                    )
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
                if (event['span.destination.service.resource'] != null
                  && !event['span.destination.service.resource'].equals("")) {

                  def outgoingLocation = getDestination(event);
                  def outgoingPath = new ArrayList(basePath);
                  outgoingPath.add(outgoingLocation);
                  context.paths.add(outgoingPath);
                }
        
                event.path = basePath;
                context.processedEvents[currentEventId] = event;

                // reprocess events which were waiting for their parents to be processed
                while (!reprocessQueue.isEmpty()) {
                  stack.push(reprocessQueue.remove());
                }
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
    body: {
      ...serviceMapParams.body,
      size: 1,
      terminate_after: numDocsPerShardAllowed,
      aggs: serviceMapAggs,
    },
  };

  const serviceMapFromTraceIdsScriptResponse = await apmEventClient.search(
    'get_service_paths_from_trace_ids',
    serviceMapParamsWithAggs
  );

  return serviceMapFromTraceIdsScriptResponse as {
    aggregations?: {
      service_map: {
        value: {
          paths: ConnectionNode[][];
          discoveredServices: Array<{
            from: ExternalConnectionNode;
            to: ServiceConnectionNode;
          }>;
        };
      };
    };
  };
}
