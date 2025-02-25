/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { IWaterfallSpanOrTransaction } from '../../public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import type { AgentName } from '../../typings/es_schemas/ui/fields/agent';
import type {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../es_fields/apm';

export type OperationId = string;
export type NodeId = string;

export interface CriticalPathSegment {
  item: IWaterfallSpanOrTransaction;
  offset: number;
  duration: number;
  self: boolean;
}

export interface CriticalPath {
  segments: CriticalPathSegment[];
}

export type OperationMetadata = {
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
      [SPAN_SUBTYPE]?: string;
    }
);

export interface CriticalPathMetadata {
  metadata: Record<OperationId, OperationMetadata>;
  timeByNodeId: Record<NodeId, number>;
  nodes: Record<NodeId, NodeId[]>;
  rootNodes: NodeId[];
  operationIdByNodeId: Record<NodeId, OperationId>;
}

export interface ServiceConnectionNode {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
}
export interface ExternalConnectionNode {
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
}

export interface CriticalPathConnectionEdge {
  from: string;
  to: string;
}
