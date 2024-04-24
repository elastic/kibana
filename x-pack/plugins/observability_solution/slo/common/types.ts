/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const DependencyRT = t.type({
  ruleId: t.string,
  actionGroupsToSuppressOn: t.array(t.string),
});

export const DependenciesRT = t.array(DependencyRT);

export type Dependency = t.OutputOf<typeof DependencyRT>;

export interface InstanceHistoryRecord {
  actionGroup: string;
  improvingFrom?: string;
  suppressed?: boolean;
  timerange: { from: number; to?: number };
}

export interface InstanceHistory {
  instanceId: string;
  history: InstanceHistoryRecord[];
}
