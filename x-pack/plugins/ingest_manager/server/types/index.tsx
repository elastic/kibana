/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export * from './models';
export * from './rest_spec';

export type AgentConfigUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentConfigId: string
) => Promise<void>;
