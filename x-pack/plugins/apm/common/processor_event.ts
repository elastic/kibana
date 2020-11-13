/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ProcessorEvent {
  transaction = 'transaction',
  error = 'error',
  metric = 'metric',
  span = 'span',
  onboarding = 'onboarding',
  sourcemap = 'sourcemap',
}
/**
 * Processor events that are searchable in the UI via the query bar.
 *
 * Some client-sideroutes will define 1 or more processor events that
 * will be used to fetch the dynamic index pattern for the query bar.
 */

export type UIProcessorEvent =
  | ProcessorEvent.transaction
  | ProcessorEvent.error
  | ProcessorEvent.metric;
