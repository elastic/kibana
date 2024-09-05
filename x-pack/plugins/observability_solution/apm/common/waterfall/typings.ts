/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Exception } from '../../typings/es_schemas/raw/error_raw';
import { EventOutcome } from '../../typings/es_schemas/raw/fields/event_outcome';
import { AgentName } from '../../typings/es_schemas/ui/fields/agent';

export interface WaterfallTransaction {
  'timestamp.us': number[];
  'trace.id': string[];
  'service.name': string[];
  'service.environment'?: string[];
  'agent.name': AgentName[];
  'event.outcome'?: EventOutcome[];
  'parent.id'?: string[];
  'processor.event': ['transaction'];
  'transaction.duration.us': number[];
  'transaction.id': string[];
  'transaction.name': string[];
  'transaction.type': string[];
  'transaction.result'?: string[];
  'faas.coldstart'?: boolean[];
  'span.links.span.id'?: string[];
  'span.links.trace.id'?: string[];
}

export interface WaterfallSpan {
  'timestamp.us': number[];
  'trace.id': string[];
  'service.name': string[];
  'service.environment'?: string[];
  'agent.name': AgentName[];
  'event.outcome'?: EventOutcome[];
  'parent.id'?: string[];
  'processor.event': ['span'];
  'span.id': string[];
  'span.type': string[];
  'span.subtype'?: string[];
  'span.action'?: string[];
  'span.name': string[];
  'span.composite.count'?: number[];
  'span.composite.sum.us'?: number[];
  'span.composite.compression_strategy'?: string[];
  'span.sync'?: boolean[];
  'span.duration.us': number[];
  'span.links.span.id'?: string[];
  'span.links.trace.id'?: string[];
  'transaction.id'?: string[];
  'child.id'?: string[];
}

export interface WaterfallError {
  'timestamp.us': number[];
  'trace.id'?: string[];
  'transaction.id'?: string[];
  'parent.id'?: string[];
  'error.id': string[];
  'error.log.message'?: string[];
  'error.exception'?: Exception[];
  'error.grouping_key': string[];
  'service.name': string[];
}
