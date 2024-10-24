/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


//Status
export const POD_STATUS_ROUTE = '/api/kubernetes/pods/status';
export const DEPLOYMENT_STATUS_ROUTE = '/api/kubernetes/deployments/status';
export const DAEMONSET_STATUS_ROUTE = '/api/kubernetes/daemonsets/status';
//CPU
export const POD_CPU_ROUTE = '/api/kubernetes/pods/cpu';
export const DEPLOYMENT_CPU_ROUTE = '/api/kubernetes/deployments/cpu';
export const DAEMONSET_CPU_ROUTE = '/api/kubernetes/daemonsets/cpu';
export const NODE_CPU_ROUTE = '/api/kubernetes/nodes/cpu';
//MEMORY
export const POD_MEMORY_ROUTE = '/api/kubernetes/pods/memory';
export const DEPLOYMENT_MEMORY_ROUTE = '/api/kubernetes/deployments/memory';
export const DAEMONSET_MEMORY_ROUTE = '/api/kubernetes/daemonsets/memory';
export const NODE_MEMORY_ROUTE = '/api/kubernetes/nodes/memory';
//EVENTS
export const EVENTS_ROUTE = '/api/kubernetes/events';
//OPENAI
export const OPENAI_ROUTE = '/api/kubernetes/openai/analyze';
