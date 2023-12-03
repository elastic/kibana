/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { DurationInputObject } from 'moment';

export type NodeType = 'host' | 'pod' | 'container' | 'awsEC2' | 'awsS3' | 'awsSQS' | 'awsRDS';

const NodeTypeMapping: Record<NodeType, string> = {
  host: 'host.name',
  container: 'container.id',
  pod: 'kubernetes.pod.uid',
  awsEC2: 'awsEC2',
  awsS3: 'awsS3',
  awsSQS: 'awsSQS',
  awsRDS: 'awsRDS',
};

export const getNodeQuery = (type: NodeType, id: string) => {
  return { language: 'kuery', query: `${NodeTypeMapping[type]}: ${id}` };
};

export const getTraceQuery = (traceId: string) => {
  return { language: 'kuery', query: `trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}")` };
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

export const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

export const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
