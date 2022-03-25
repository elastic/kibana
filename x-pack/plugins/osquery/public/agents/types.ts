/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { Agent } from '../../common/shared_imports';

interface BaseDataPoint {
  key: string;
  doc_count: number;
}

interface AggDataPoint extends estypes.AggregationsTermsAggregateBase {
  buckets: AggregationDataPoint[];
}

export type AggregationDataPoint = BaseDataPoint & {
  [key: string]: AggDataPoint;
};

export interface Group {
  id: string;
  name: string;
  size: number;
}
export interface Overlap {
  [platform: string]: { [policy: string]: number };
}

export interface SelectedGroups {
  [groupType: string]: { [groupName: string]: number };
}

export type GroupedAgent = Pick<Agent, 'local_metadata' | 'policy_id' | 'status'>;

export type GroupOption = EuiComboBoxOptionOption<AgentOptionValue | GroupOptionValue>;

export interface AgentSelection {
  agents: string[];
  allAgentsSelected: boolean;
  platformsSelected: string[];
  policiesSelected: string[];
}

interface BaseGroupOption {
  id?: string;
  groupType: AGENT_GROUP_KEY;
}

export type AgentOptionValue = BaseGroupOption & {
  groups: { [groupType: string]: string };
  status: string;
};

export type GroupOptionValue = BaseGroupOption & {
  size: number;
};

export enum AGENT_GROUP_KEY {
  All,
  Platform,
  Policy,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Agent,
}
