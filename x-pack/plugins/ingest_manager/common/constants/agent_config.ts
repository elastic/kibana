/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AgentConfigStatus, DefaultPackages } from '../types';

export const AGENT_CONFIG_SAVED_OBJECT_TYPE = 'ingest-agent-configs';

export const DEFAULT_AGENT_CONFIG = {
  name: 'Default config',
  namespace: 'default',
  description: 'Default agent configuration created by Kibana',
  status: AgentConfigStatus.Active,
  package_configs: [],
  is_default: true,
  monitoring_enabled: ['logs', 'metrics'] as Array<'logs' | 'metrics'>,
};

export const DEFAULT_AGENT_CONFIGS_PACKAGES = [DefaultPackages.system];
