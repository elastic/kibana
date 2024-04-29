/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SerializedTitles,
  PublishesWritablePanelTitle,
  PublishesPanelTitle,
} from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';
import { Filter } from '@kbn/es-query';
import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

export type OverviewMode = 'single' | 'groups';
export type GroupBy = 'slo.tags' | 'status' | 'slo.indicator.type';
export interface GroupFilters {
  groupBy: GroupBy;
  groups?: string[];
  filters?: Filter[];
  kqlQuery?: string;
}

// rename SignleSloProps to SingleSloCustomInput
export type SingleSloProps = EmbeddableSloProps & {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  showAllGroupByInstances?: boolean;
};

// rename GroupSloProps to GroupSloCustomInput
export type GroupSloProps = EmbeddableSloProps & {
  groupFilters: GroupFilters;
};

// TODO refactor this
// keep overviewMode
// delete sloId, sloInstanceId, renderComplete
// keep remoteName and reloadSubject
export interface EmbeddableSloProps {
  sloId?: string;
  sloInstanceId?: string;
  remoteName?: string;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
  overviewMode?: OverviewMode;
}

export type SloEmbeddableInput = EmbeddableInput & Partial<GroupSloProps> & Partial<SingleSloProps>;
export type SloOverviewEmbeddableState = SerializedTitles &
  Partial<GroupSloProps> &
  Partial<SingleSloProps>;

export type OverviewApi = DefaultEmbeddableApi<SloOverviewEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle &
  HasSloOverviewConfig;

export interface HasSloOverviewConfig {
  getSloOverviewConfig: () => GroupSloProps | SingleSloProps;
  updateSloOverviewConfig: (next: GroupSloProps | SingleSloProps) => void;
}

export const apiHasSloOverviewConfig = (api: unknown | null): api is HasSloOverviewConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloOverviewConfig).getSloOverviewConfig === 'function' &&
      typeof (api as HasSloOverviewConfig).updateSloOverviewConfig === 'function'
  );
};

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  theme: CoreStart['theme'];
  application: ApplicationStart;
  notifications: NotificationsStart;
  observability: ObservabilityPublicStart;
  uiActions: UiActionsStart;
}

export type SloOverviewEmbeddableActionContext = EmbeddableApiContext & {
  embeddable: OverviewApi;
};
