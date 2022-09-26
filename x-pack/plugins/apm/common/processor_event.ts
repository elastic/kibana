/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import * as t from 'io-ts';

export const processorEventRt = t.union([
  t.literal(ProcessorEvent.transaction),
  t.literal(ProcessorEvent.error),
  t.literal(ProcessorEvent.metric),
  t.literal(ProcessorEvent.span),
]);
/**
 * Processor events that are searchable in the UI via the query bar.
 *
 * Some client-sideroutes will define 1 or more processor events that
 * will be used to fetch the dynamic data view for the query bar.
 */

export type UIProcessorEvent =
  | ProcessorEvent.transaction
  | ProcessorEvent.error
  | ProcessorEvent.metric;
