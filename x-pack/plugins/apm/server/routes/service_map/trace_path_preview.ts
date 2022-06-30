/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery } from '@kbn/observability-plugin/server';
import { TRACE_ID } from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../../lib/helpers/setup_request';
import { ProcessorEvent } from '../../../common/processor_event';

export async function getServiceMapTracePathsPreview({
  setup,
  start,
  end,
}: {
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;
  const response = await apmEventClient.search('get_trace_paths', {
    apm: {
      events: [ProcessorEvent.transaction, ProcessorEvent.span],
    },
    body: {
      size: 0,
      query: { bool: { filter: [...rangeQuery(start, end)] } },
      // sort by trace.id to avoid only getting latest traces
      sort: [{ [TRACE_ID]: { order: 'asc' as const } }],
      aggs: tracePathsAggs,
    },
  });

  return response.aggregations?.service_map.value;
}

export const tracePathsAggs = {
  service_map: {
    scripted_metric: {
      init_script: {
        lang: 'painless',
        source: `
          state.eventsById = new HashMap();
          state.parentIds = new ArrayList();
          state.traceIds = new HashSet();

          String[] fieldsToCopy = new String[] {
            'parent.id',
            'service.name',
            'service.environment',
            'span.destination.service.resource',
            'trace.id',
            'processor.event',
            'span.type',
            'span.subtype',
            'agent.name',
            'transaction.type',
            '@timestamp'
          };
          state.fieldsToCopy = fieldsToCopy;`,
      },
      map_script: {
        lang: 'painless',
        source: `
          //  limit to 1000 traces
          def MAX_NUM_TRACES = 1000;
        
          def traceId = doc['trace.id'].value;
          if (state.traceIds.size() >= MAX_NUM_TRACES && !state.traceIds.contains(traceId)) {
            return;
          }
          state.traceIds.add(traceId);
        
          def id;
          if (!doc['span.id'].empty) {
            id = doc['span.id'].value;
          } else {
            id = doc['transaction.id'].value;
          }

          def copy = new HashMap();
          copy.id = id;

          for(key in state.fieldsToCopy ) {
            if (!doc[key].empty) {
              copy[key] = doc[key].value;
            }
          }
          
          if(!doc['parent.id'].empty) {
            state.parentIds.add(doc['parent.id'].value);
          }

          state.eventsById[id] = copy`,
      },
      combine_script: {
        lang: 'painless',
        source: `
          return [
            'eventsById': state.eventsById, 
            'parentIds': state.parentIds
          ];
        `,
      },
      reduce_script: {
        lang: 'painless',
        source: `

        def getLeafNode ( def event, def hash ) {
          def leafNode = new HashMap();
          leafNode['span.destination.service.resource'] = event['span.destination.service.resource'];
          leafNode['span.type'] = event['span.type'];
          leafNode['span.subtype'] = event['span.subtype'];
          leafNode['upstream.hash'] = hash;
          leafNode['trace.id'] = event['trace.id'];
          leafNode['parent.id'] = event['parent.id'];
          leafNode['id'] = event['id'];
          leafNode['leafNode'] = true;
          
          return leafNode;
        }
        
        def getNode(def event) {
          return [ 
            '@timestamp': event['@timestamp'], 
            'service.name': event['service.name'], 
            'service.environment': event['service_environment'], 
            'agent.name': event['agent.name'], 
            'processor.event': event['processor.event'],
            'parent.id': event['parent.id'],
            'id': event['id'],
            'trace.id': event['trace.id'],
            'leafNode': false
          ];          
        }

        def isParent(def context, def eventId) {
          return context.parentIds.contains(eventId);
        }

        def processAndReturnEvent(def context, def eventId) {
          if (context.processedEvents[eventId] != null) {
            return context.processedEvents[eventId];
          }
          
          def event = context.eventsById[eventId];
          if (event == null) {
            return null;
          }
          
          def node = getNode(event);
          context.processedEvents[eventId] = node;
          
          def tracePath = [];
          def parentId = event['parent.id'];
          def parent;
          def upstreamHash = '';
          def hash = '';
          
          if (parentId != null && parentId != event['id']) {
            parent = processAndReturnEvent(context, parentId);
            if (parent != null) {
              /* copy the path from the parent */
              tracePath.addAll(parent.path);
              
              if (parent['downstream.hash'] != null) {
                upstreamHash = parent['downstream.hash'];
                hash = [ 
                  'service.name': node['service.name'], 
                  'service.environment': node['service.environment'], 
                  'upstreamHash': upstreamHash 
                ].hashCode().toString();
              } else {
                hash = parent.hash;
              }
            }
          }
          
          node['upstream.hash'] = upstreamHash;
          node.hash = hash;
          
          if (event['span.destination.service.resource'] != null) {
            node['downstream.hash'] = [ 
              'service.name': node['service.name'], 
              'service.environment': node['service.environment'], 
              'upstreamHash': upstreamHash, 
              'hash': hash, 
              'span.destination.service.resource': event['span.destination.service.resource'] 
            ].hashCode().toString();

            node['span.destination.service.resource'] = event['span.destination.service.resource'];
          }
          
          if(event['span.type'] != null) {
            node['span.type'] = event['span.type'];
          }
          
          if (event['transaction.type'] != null) {
            node['transaction.type'] = event['transaction.type'];
          }


          /* only add the current location to the path if it's different from the last one*/
          if (
            parent == null
              || parent['service.name'] != node['service.name']
              || parent['service.environment'] != node['service.environment']
              || event['span.destination.service.resource'] != null
          ) {
            // node.id = eventId;
            // node['parent.id'] = parentId;
            def clone = node.clone();
            node.remove('path');
            tracePath.add(clone);
          }

          /* if there is an outgoing span, create a new path */
          if (event['span.destination.service.resource'] != null
            && event['span.destination.service.resource'] != '') {
            
            def leafNode = getLeafNode(event, node['downstream.hash']);
            def fullTracePath = new ArrayList(tracePath);
            fullTracePath.add(leafNode);
            
            // Only add if leafNode is not a parent (in which case it's not a leaf node)            
            if(!isParent(context, leafNode.id)) {
              def leafNodeHash = leafNode['upstream.hash'];
              context.paths[leafNodeHash] = fullTracePath;
            }
          }

          node.path = tracePath;

          return node;
        }


        def context = new HashMap();
        context.parentIds = new ArrayList();
        context.processedEvents = new HashMap();
        context.eventsById = new HashMap();
        context.paths = new HashMap();

        for (state in states) {
          context.parentIds.addAll(state['parentIds']);
          context.eventsById.putAll(state['eventsById']);
        }
        
        for (eventId in context.eventsById.keySet()) {
          // only leaf events (which don't have any children and thus not parents)
          if (!isParent(context, eventId)) {
            processAndReturnEvent(context, eventId);
          }
        }
        
        def tracePaths = new HashSet();
        tracePaths.addAll(context.paths.values());
                
        def output = new HashMap();                
        output.pathCount = tracePaths.size();
        output.tracePaths = tracePaths;
        return output;          
        `,
      },
    },
  },
};
