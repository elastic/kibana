/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TermsAggregate } from '@elastic/elasticsearch/api/types';

interface BaseDataPoint {
  key: string;
  doc_count: number;
}

export type AggregationDataPoint = BaseDataPoint & {
  [key: string]: TermsAggregate<AggregationDataPoint>;
};

export interface Group {
  name: string;
  size: number;
}
export interface Overlap {
  [platform: string]: { [policy: string]: number };
}

export interface SelectedGroups {
  [groupType: string]: { [groupName: string]: number };
}

interface BaseGroupOption {
  groupType: AGENT_GROUP_KEY;
}

export type AgentOptionValue = BaseGroupOption & {
  groups: { [groupType: string]: string };
  online: boolean;
  id: string;
};

export type GroupOptionValue = BaseGroupOption & {
  size: number;
};

export enum AGENT_GROUP_KEY {
  All,
  Platform,
  Policy,
  Agent,
}
