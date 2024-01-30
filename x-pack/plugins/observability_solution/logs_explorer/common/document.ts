/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils/src/types';

export interface LogDocument extends DataTableRecord {
  flattened: {
    '@timestamp': string;
    'log.level'?: [string];
    message?: [string];
    'error.message'?: string;
    'event.original'?: string;

    'host.name'?: string;
    'service.name'?: string;
    'trace.id'?: string;
    'agent.name'?: string;
    'orchestrator.cluster.name'?: string;
    'orchestrator.cluster.id'?: string;
    'orchestrator.resource.id'?: string;
    'orchestrator.namespace'?: string;
    'container.name'?: string;
    'container.id'?: string;
    'cloud.provider'?: string;
    'cloud.region'?: string;
    'cloud.availability_zone'?: string;
    'cloud.project.id'?: string;
    'cloud.instance.id'?: string;
    'log.file.path'?: string;
    'data_stream.namespace': string;
    'data_stream.dataset': string;

    'error.stack_trace'?: string;
    'error.exception.stacktrace'?: string;
    'error.log.stacktrace'?: string;
  };
}

export interface FlyoutDoc {
  '@timestamp': string;
  'log.level'?: string;
  message?: string;
  'error.message'?: string;
  'event.original'?: string;

  'host.name'?: string;
  'service.name'?: string;
  'trace.id'?: string;
  'agent.name'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.cluster.id'?: string;
  'orchestrator.resource.id'?: string;
  'orchestrator.namespace'?: string;
  'container.name'?: string;
  'cloud.provider'?: string;
  'cloud.region'?: string;
  'cloud.availability_zone'?: string;
  'cloud.project.id'?: string;
  'cloud.instance.id'?: string;
  'log.file.path'?: string;
  'data_stream.namespace': string;
  'data_stream.dataset': string;
}

export interface ResourceFields {
  'host.name'?: string;
  'service.name'?: string;
  'agent.name'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.cluster.id'?: string;
  'orchestrator.resource.id'?: string;
  'orchestrator.namespace'?: string;
  'container.name'?: string;
  'container.id'?: string;
  'cloud.instance.id'?: string;
}

export interface StackTraceFields {
  'error.stack_trace'?: string;
  'error.exception.stacktrace'?: string;
  'error.log.stacktrace'?: string;
}
