/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes } from '../../../../../../src/core/public';
import { Datasource } from './datasource';

export enum AgentConfigStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface NewAgentConfig {
  name: string;
  namespace: string;
  description?: string;
}

export interface AgentConfig extends NewAgentConfig, SavedObjectAttributes {
  id: string;
  status: AgentConfigStatus;
  datasources: string[] | Datasource[];
  updated_on: string;
  updated_by: string;
}
