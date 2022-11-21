/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery, termsQuery } from '@kbn/observability-plugin/server';
import { Logger } from '@kbn/logging';
import {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

type OperationMetadata = {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: AgentName;
} & (
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.transaction;
      [TRANSACTION_TYPE]: string;
      [TRANSACTION_NAME]: string;
    }
  | {
      [PROCESSOR_EVENT]: ProcessorEvent.span;
      [SPAN_NAME]: string;
      [SPAN_TYPE]: string;
      [SPAN_SUBTYPE]: string;
    }
);

type OperationId = string;

type NodeId = string;

export interface CriticalPathResponse {
  metadata: Record<OperationId, OperationMetadata>;
  timeByNodeId: Record<NodeId, number>;
  nodes: Record<NodeId, NodeId[]>;
  rootNodes: NodeId[];
  operationIdByNodeId: Record<NodeId, OperationId>;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export async function getAggregatedCriticalPath({
  traceIds,
  start,
  end,
  apmEventClient,
  serviceName,
  transactionName,
  logger,
}: {
  traceIds: string[];
  start: number;
  end: number;
  apmEventClient: APMEventClient;
  serviceName: string | null;
  transactionName: string | null;
  logger: Logger;
}): Promise<{ criticalPath: CriticalPathResponse | null }> {
  const now = Date.now();

  const response = await apmEventClient.search('get_aggregated_critical_path', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...termsQuery(TRACE_ID, ...traceIds),
            // we need a range query to allow ES to skip shards based on the time range,
            // but we need enough padding to make sure we get the full trace
            ...rangeQuery(start - TWO_DAYS_MS, end + TWO_DAYS_MS),
          ],
        },
      },
      aggs: {
        critical_path: {
          scripted_metric: {
            params: {
              // can't send null parameters to ES. undefined will be removed during JSON serialisation
              serviceName: serviceName || undefined,
              transactionName: transactionName || undefined,
            },
            init_script: {
              source: `
                state.eventsById = [:];
                state.metadataByOperationId = [:];
              `,
            },
            map_script: {
              source: `
                String toHash (def item) {
                  long FNV_32_INIT = 0x811c9dc5L;
                  long FNV_32_PRIME = 0x01000193L;
                  char[] chars = item.toString().toCharArray();
                  long rv = FNV_32_INIT;
                  int len = chars.length;
                  for(int i = 0; i < len; i++) {
                      byte bt = (byte) chars[i];
                      rv ^= bt;
                      rv *= FNV_32_PRIME;
                  }
                  return rv.toString();
                }
                
                def id;
                double duration;
                
                def operationMetadata = [
                  "service.name": doc['service.name'].value,
                  "processor.event": doc['processor.event'].value,
                  "agent.name": doc['agent.name'].value
                ];

                def isSpan = !doc['span.id'].empty;
                
                if (isSpan) {
                  id = doc['span.id'].value;
                  operationMetadata.put('span.name', doc['span.name'].value);
                  if (!doc['span.type'].empty) {
                    operationMetadata.put('span.type', doc['span.type'].value);
                  }
                  if (!doc['span.subtype'].empty) {
                    operationMetadata.put('span.subtype', doc['span.subtype'].value);
                  }
                  duration = doc['span.duration.us'].value;
                } else {
                  id = doc['transaction.id'].value;
                  operationMetadata.put('transaction.name', doc['transaction.name'].value);
                  operationMetadata.put('transaction.type', doc['transaction.type'].value);
                  duration = doc['transaction.duration.us'].value;
                }
                 
                String operationId = toHash(operationMetadata);
                
                def map = [
                  "traceId": doc['trace.id'].value,
                  "id": id,
                  "parentId": doc['parent.id'].empty ? null : doc['parent.id'].value,
                  "operationId": operationId,
                  "timestamp": doc['timestamp.us'].value,
                  "duration": duration
                ];
                
                if (state.metadataByOperationId[operationId] == null) {
                  state.metadataByOperationId.put(operationId, operationMetadata);
                }
                state.eventsById.put(id, map);
              `,
            },
            combine_script: {
              source: 'return state;',
            },
            reduce_script: {
              source: `
                String toHash (def item) {
                  long FNV_32_INIT = 0x811c9dc5L;
                  long FNV_32_PRIME = 0x01000193L;
                  char[] chars = item.toString().toCharArray();
                  long rv = FNV_32_INIT;
                  int len = chars.length;
                  for(int i = 0; i < len; i++) {
                      byte bt = (byte) chars[i];
                      rv ^= bt;
                      rv *= FNV_32_PRIME;
                  }
                  return rv.toString();
                }
                
                def processEvent (def context, def event) {
                  if (context.processedEvents[event.id] != null) {
                    return context.processedEvents[event.id];
                  }
                  
                  def processedEvent = [
                    "children": []
                  ];
                  
                  if(event.parentId != null) {
                    def parent = context.events[event.parentId];
                    if (parent == null) {
                      return null;
                    }
                    def processedParent = processEvent(context, parent);
                    if (processedParent == null) {
                      return null;
                    }
                    processedParent.children.add(processedEvent);
                  }
                  
                  context.processedEvents.put(event.id, processedEvent);
                  
                  processedEvent.putAll(event);

                  if (context.params.serviceName != null && context.params.transactionName != null) {
                    
                    def metadata = context.metadata[event.operationId];
                    
                    if (metadata != null
                      && context.params.serviceName == metadata['service.name']
                      && metadata['transaction.name'] != null 
                      && context.params.transactionName == metadata['transaction.name']
                    ) {
                      context.entryTransactions.add(processedEvent);
                    }

                  } else if (event.parentId == null) {
                    context.entryTransactions.add(processedEvent);
                  }
                  
                  return processedEvent;
                }
                
                double getClockSkew (def context, def item, def parent ) {
                  if (parent == null) {
                    return 0;
                  }
                  
                  def processorEvent = context.metadata[item.operationId]['processor.event'];
                  
                  def isTransaction = processorEvent == 'transaction';
                  
                  if (!isTransaction) {
                    return parent.skew;
                  }
                  
                  double parentStart = parent.timestamp + parent.skew;
                  double offsetStart = parentStart - item.timestamp;
                  if (offsetStart > 0) {
                    double latency = Math.round(Math.max(parent.duration - item.duration, 0) / 2);
                    return offsetStart + latency;
                  }
                  
                  return 0;
                }
                
                void setOffsetAndSkew ( def context, def event, def parent, def startOfTrace ) {
                  event.skew = getClockSkew(context, event, parent);
                  event.offset = event.timestamp - startOfTrace;
                  for(child in event.children) {
                    setOffsetAndSkew(context, child, event, startOfTrace);
                  }
                  event.end = event.offset + event.skew + event.duration;
                }
                
                void count ( def context, def nodeId, def duration ) {
                  context.timeByNodeId[nodeId] = (context.timeByNodeId[nodeId] ?: 0) + duration;
                }
                
                void scan ( def context, def item, def start, def end, def path ) {
                  
                  def nodeId = toHash(path);
        
                  def childNodes = context.nodes[nodeId] != null ? context.nodes[nodeId] : [];
                  
                  context.nodes[nodeId] = childNodes;
                  
                  context.operationIdByNodeId[nodeId] = item.operationId;
                  
                  if (item.children.size() == 0) {
                    count(context, nodeId, end - start);
                    return;
                  }
                  
                  item.children.sort((a, b) -> {
                    if (b.end === a.end) {
                      return 0;
                    }
                    if (b.end > a.end) {
                      return 1;
                    }
                    return -1;
                  });
                  
                  def scanTime = end;
                  
                  for(child in item.children) {
                    double normalizedChildStart = Math.max(child.offset + child.skew, start);
                    double childEnd = child.offset + child.skew + child.duration;
                    
                    double normalizedChildEnd = Math.min(childEnd, scanTime);
              
                    def isOnCriticalPath = !(
                      normalizedChildStart >= scanTime ||
                      normalizedChildEnd < start ||
                      childEnd > scanTime
                    );
                    
                    if (!isOnCriticalPath) {
                      continue;
                    }
                    
                    def childPath = path.clone();
                    
                    childPath.add(child.operationId);
                    
                    def childId = toHash(childPath);
                    
                    if(!childNodes.contains(childId)) {
                      childNodes.add(childId);
                    }
                    
                    if (normalizedChildEnd < (scanTime - 1000)) {
                      count(context, nodeId, scanTime - normalizedChildEnd); 
                    }
                    
                    scan(context, child, normalizedChildStart, childEnd, childPath);
                    
                    scanTime = normalizedChildStart;
                  }
                  
                  if (scanTime > start) {
                    count(context, nodeId, scanTime - start);
                  }
                  
                }
              
                def events = [:];
                def metadata = [:];
                def processedEvents = [:];
                def entryTransactions = [];
                def timeByNodeId = [:];
                def nodes = [:];
                def rootNodes = [];
                def operationIdByNodeId = [:];
                
                
                def context = [
                  "events": events,
                  "metadata": metadata,
                  "processedEvents": processedEvents,
                  "entryTransactions": entryTransactions,
                  "timeByNodeId": timeByNodeId,
                  "nodes": nodes,
                  "operationIdByNodeId": operationIdByNodeId,
                  "params": params
                ];
              
                for(state in states) {
                  if (state.eventsById != null) {
                    events.putAll(state.eventsById);
                  }
                  if (state.metadataByOperationId != null) {
                    metadata.putAll(state.metadataByOperationId);
                  }
                }
                
                
                for(def event: events.values()) {
                  processEvent(context, event);
                }
                
                for(transaction in context.entryTransactions) {
                  transaction.skew = 0;
                  transaction.offset = 0;
                  setOffsetAndSkew(context, transaction, null, transaction.timestamp);
                  
                  def path = [];
                  def parent = transaction;
                  while (parent != null) {
                    path.add(parent.operationId);
                    if (parent.parentId == null) {
                      break;
                    }
                    parent = context.processedEvents[parent.parentId];
                  }

                  Collections.reverse(path);

                  def nodeId = toHash(path);
                  
                  scan(context, transaction, 0, transaction.duration, path);
                  
                  if (!rootNodes.contains(nodeId)) {
                    rootNodes.add(nodeId);
                  }
                  
                }
                
                return [
                  "timeByNodeId": timeByNodeId,
                  "metadata": metadata,
                  "nodes": nodes,
                  "rootNodes": rootNodes,
                  "operationIdByNodeId": operationIdByNodeId
                ];`,
            },
          },
        },
      },
    },
  });

  logger.debug(
    `Retrieved critical path in ${Date.now() - now}ms, took: ${response.took}ms`
  );

  if (!response.aggregations) {
    return {
      criticalPath: null,
    };
  }

  const criticalPath = response.aggregations?.critical_path
    .value as CriticalPathResponse;

  return {
    criticalPath,
  };
}
