/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowRunEvent } from '@kbn/wc-framework-types-common';
import type { ToolProvider } from '../tools';

export type WorkflowRunEventHandler = (event: WorkflowRunEvent) => void;

export interface RunWorkflowParams<Input = Record<string, unknown>> {
  /**
   * The ID of the workflow to run.
   */
  id: string;
  /**
   * The inputs to execute the workflow with.
   * Inputs will be validated against the defined schema.
   */
  inputs: Input;
  /**
   * The request that initiated that run.
   */
  request: KibanaRequest;
  /**
   * If specified, the workflow runner will use
   * tools from this provider in addition to the default ones when
   * running the workflow.
   *
   * Can be used to expose custom tools.
   */
  toolProvider?: ToolProvider;
  /**
   * Optional event handler to handle workflow execution events.
   *
   * Can be used to handle progression events in real time.
   */
  onEvent?: WorkflowRunEventHandler;
  /**
   * If specified, will use that connector as the default connector
   * instead of picking the default one automatically.
   */
  defaultConnectorId?: string;
}

export interface RunWorkflowOutput<Output = Record<string, unknown>> {
  /**
   * The runId that was bound to this run. Can be used to find events in
   * tracing / telemetry or so on.
   */
  runId: string;
  /**
   * The output from the workflow.
   */
  output: Output;
}

export interface WorkflowRunner<Input = Record<string, unknown>, Output = Record<string, unknown>> {
  run(options: RunWorkflowParams<Input>): Promise<RunWorkflowOutput<Output>>;
}
