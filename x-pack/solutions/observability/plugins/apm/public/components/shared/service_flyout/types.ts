/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';

export interface ServiceFlyoutService {
  name: string;
  agentName?: AgentName;
}

export interface ServiceFlyoutOptions {
  transactionType?: string;
  rangeFrom?: string;
  rangeTo?: string;
  /** Initial latency aggregation type, e.g. inherited from a rule or the host page. */
  latencyAggregationType?: LatencyAggregationType;
  /** Previous-period comparison, matching the host page's comparison toggle. */
  comparisonEnabled?: boolean;
  offset?: string;
  /**
   * Display-only: tells the flyout the host context is scoped to this transaction name.
   * The flyout charts are NOT filtered by it — they show service-level metrics.
   */
  transactionName?: string;
}
