/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverGraphNode } from '../types';
import { firstNonNullValue } from './ecs_safety_helpers';

interface DataTimestamp {
  '@timestamp': number | undefined;
}
/**
 * @description - Extract the first non null value from the nodeId depending on the datasource. Returns
 * undefined if the field was never set.
 */
export function nodeID(node: ResolverGraphNode): string | undefined {
  return node?.nodeId ? String(firstNonNullValue(node.nodeId)) : undefined;
}

/**
 * @description - Provides the parent for the given node
 */
export function parentId(node: ResolverGraphNode): string | undefined {
  return node?.parent ? String(firstNonNullValue(node?.parent)) : undefined;
}

/**
 * Extracts the first non null value from the `@timestamp` field in the node data attribute.
 */
export function nodeDataTimestamp(node: ResolverGraphNode): undefined | number {
  const nodeData: DataTimestamp = node?.data as DataTimestamp;

  return nodeData?.['@timestamp'] ? firstNonNullValue(nodeData?.['@timestamp']) : undefined;
}
