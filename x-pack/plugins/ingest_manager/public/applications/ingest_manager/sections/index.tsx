/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export { IngestManagerOverview } from './overview';
export { EPMApp } from './epm';
export { AgentConfigApp } from './agent_config';
export { FleetApp } from './fleet';

export type Section = 'overview' | 'epm' | 'agent_config' | 'fleet';
