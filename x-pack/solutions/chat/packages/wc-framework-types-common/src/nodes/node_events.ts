/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Node progression event.
 *
 * Can be emitted to do real time status update during a workflow execution.
 */
export interface NodeProgressionEvent {
  /**
   * The type of event, `node_progression`.
   */
  eventType: 'node_progression';
  /**
   * Meta bound to this event
   */
  meta: NodeEventMeta;
  /**
   * A human-readable label to display for this progression event.
   */
  label: string;
  /**
   * Optional, arbitrary data associated with this event.
   */
  data?: Record<string, string>;
}

/**
 * Meta information attached to a node event.
 */
export interface NodeEventMeta {
  /**
   * The id of the node this event was fired from.
   */
  nodeId: string;
  /**
   * The type of the node this event was fired from.
   */
  nodeType: string;
  /**
   * The id of the workflow this event was fired from
   */
  workflowId: string;
}

export type NodeEvent = NodeProgressionEvent;
