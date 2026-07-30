/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';

export type { AgentApmRelatedAlertsProps } from './agent_apm_related_alerts';

export const LazyAgentApmRelatedAlerts = dynamic(() =>
  import('./agent_apm_related_alerts').then((mod) => ({
    default: mod.AgentApmRelatedAlerts,
  }))
);
