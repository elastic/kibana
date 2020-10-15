/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export { IngestManagerOverview } from './overview';
export { EPMApp } from './epm';
export { AgentPolicyApp } from './agent_policy';
export { DataStreamApp } from './data_stream';
export { FleetApp } from './fleet';

export type Section = 'overview' | 'epm' | 'agent_policy' | 'fleet' | 'data_stream';
