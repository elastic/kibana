/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';

export interface ServiceFlyoutService {
  name: string;
  agentName?: AgentName;
}

export interface ServiceFlyoutOptions {
  transactionType?: string;
  rangeFrom?: string;
  rangeTo?: string;
}
