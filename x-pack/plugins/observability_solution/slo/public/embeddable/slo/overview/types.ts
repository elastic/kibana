/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';
import { SLOGroupWithSummaryResponse } from '@kbn/slo-schema';

export type OverviewMode = 'single' | 'groups';
type GroupBy = 'slo.tags' | 'status' | 'slo.indicator.type';
export interface GroupFilters {
  groupBy: GroupBy;
  groups?: SLOGroupWithSummaryResponse[];
}

export type SingleSloProps = EmbeddableSloProps & {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  showAllGroupByInstances?: boolean;
};

export type GroupSloProps = EmbeddableSloProps & {
  groupFilters: GroupFilters;
};

export interface EmbeddableSloProps {
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
  overviewMode?: OverviewMode;
}

export type SloEmbeddableInput = EmbeddableInput & Partial<GroupSloProps> & Partial<SingleSloProps>;
