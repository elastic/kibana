/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface NodeRef {
  type: 'node';
  id: string;
}

export interface WorkflowRef {
  type: 'workflow';
  id: string;
}

export type CallChainRef = NodeRef | WorkflowRef;

export type CallChain = CallChainRef[];
