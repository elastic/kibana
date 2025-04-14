/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRunEvent } from '@kbn/wc-framework-types-common';

export type WorkflowRunEventHandler = (event: WorkflowRunEvent) => void;

interface RunWorkflowParams<Input = unknown> {
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
   * Optional event handler to handle workflow execution events.
   *
   * Can be used to handle progression events in real time.
   */
  onEvent?: WorkflowRunEventHandler;

  // TODO: tool provider
}

interface RunWorkflowOutput<Output = unknown> {
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

// TODO: structured errors thrown containing runId too...

export interface WorkflowRunner {
  run(options: RunWorkflowParams): Promise<RunWorkflowOutput>;
}
