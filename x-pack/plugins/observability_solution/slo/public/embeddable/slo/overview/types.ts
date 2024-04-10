/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';
import { Filter } from '@kbn/es-query';

export type OverviewMode = 'single' | 'groups';
export type GroupBy = 'slo.tags' | 'status' | 'slo.indicator.type';
export interface GroupFilters {
  groupBy: GroupBy;
  groups?: string[] | undefined[];
  tagsFilter?: Filter;
  filters?: Filter[];
  kqlQuery?: string;
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

export interface HasSloOverviewConfig {
  getSloOverviewConfig: () => SloEmbeddableInput;
  updateSloOverviewConfig: (next: SloEmbeddableInput) => void;
}

export const apiHasSloAlertsConfig = (api: unknown | null): api is HasSloOverviewConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloOverviewConfig).getSloOverviewConfig === 'function' &&
      typeof (api as HasSloOverviewConfig).updateSloOverviewConfig === 'function'
  );
};
