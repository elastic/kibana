/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum StackTracesDisplayOption {
  StackTraces = 'stackTraces',
  Percentage = 'percentage',
}

export enum TopNType {
  Containers = 'containers',
  Deployments = 'deployments',
  Threads = 'threads',
  Hosts = 'hosts',
  Traces = 'traces',
}

export function getFieldNameForTopNType(type: TopNType): string {
  return {
    [TopNType.Containers]: 'container.name',
    [TopNType.Deployments]: 'orchestrator.resource.name',
    [TopNType.Threads]: 'process.thread.name',
    [TopNType.Hosts]: 'host.id',
    [TopNType.Traces]: 'Stacktrace.id',
  }[type];
}
