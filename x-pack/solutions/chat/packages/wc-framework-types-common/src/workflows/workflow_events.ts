/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeEvent, NodeProgressionEvent } from '../nodes';

/**
 * Workflow progression event.
 *
 * Can be emitted to do real time status update during a workflow execution.
 */
export interface WorkflowProgressionEvent {
  /**
   * The type of event, `workflow_progression`.
   */
  eventType: 'workflow_progression';
  /**
   * Meta bound to this event
   */
  meta: {
    /**
     * The id of the workflow this event was fired from
     */
    workflowId: string;
  };
  /**
   * A human-readable label to display for this progression event.
   */
  label: string;
  /**
   * Optional, arbitrary data associated with this event.
   */
  data?: Record<string, string>;
}

export type WorkflowEvent = WorkflowProgressionEvent;

/**
 * Represent all type of events that can be fired during a workflow run
 */
export type WorkflowRunEvent = NodeEvent | WorkflowEvent;

/**
 * Checks if the given workflow run event is a {@link NodeProgressionEvent}
 */
export const isNodeProgressionEvent = (event: WorkflowRunEvent): event is NodeProgressionEvent => {
  return event.eventType === 'node_progression';
};

/**
 * Checks if the given workflow run event is a {@link WorkflowProgressionEvent}
 */
export const isWorkflowProgressionEvent = (
  event: WorkflowRunEvent
): event is WorkflowProgressionEvent => {
  return event.eventType === 'workflow_progression';
};
