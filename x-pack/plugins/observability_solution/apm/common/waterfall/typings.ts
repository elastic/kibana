/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Exception } from '../../typings/es_schemas/raw/error_raw';
import { EventOutcome } from '../../typings/es_schemas/raw/fields/event_outcome';
import { SpanLink } from '../../typings/es_schemas/raw/fields/span_links';
import { TimestampUs } from '../../typings/es_schemas/raw/fields/timestamp_us';
import { AgentName } from '../../typings/es_schemas/ui/fields/agent';

export interface WaterfallTransaction {
  timestamp: TimestampUs;
  trace: { id: string };
  service: {
    name: string;
    environment?: string;
  };
  agent: { name: AgentName };
  event?: { outcome?: EventOutcome };
  parent?: { id?: string };
  processor: { event: 'transaction' };
  transaction: {
    duration: { us: number };
    id: string;
    name: string;
    type: string;
    result?: string;
  };
  faas?: {
    coldstart?: boolean;
  };
  span?: {
    links?: SpanLink[];
  };
}

export interface WaterfallSpan {
  timestamp: TimestampUs;
  trace: { id: string };
  service: {
    name: string;
    environment?: string;
  };
  agent: { name: AgentName };
  event?: { outcome?: EventOutcome };
  parent?: { id?: string };
  processor: { event: 'span' };
  span: {
    id: string;
    type: string;
    subtype?: string;
    action?: string;
    name: string;
    composite?: {
      count: number;
      sum: { us: number };
      compression_strategy: string;
    };
    sync?: boolean;
    duration: { us: number };
    links?: SpanLink[];
  };
  transaction?: {
    id?: string;
  };
  child?: { id: string[] };
}

export interface WaterfallError {
  timestamp: TimestampUs;
  trace?: { id?: string };
  transaction?: { id?: string };
  parent?: { id?: string };
  span?: { id?: string };
  error: {
    id: string;
    log?: {
      message: string;
    };
    exception?: Exception[];
    grouping_key: string;
  };
  service: {
    name: string;
  };
}
