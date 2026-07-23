/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloStatus } from '@kbn/apm-types';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { ServiceFlyoutSource } from './constants';

export interface ServiceFlyoutService {
  name: string;
  agentName?: AgentName;
  sloStatus?: SloStatus | 'noSLOs';
  sloCount?: number;
}

export interface ServiceFlyoutOptions {
  transactionType?: string;
  rangeFrom?: string;
  rangeTo?: string;
  source?: ServiceFlyoutSource;
}
