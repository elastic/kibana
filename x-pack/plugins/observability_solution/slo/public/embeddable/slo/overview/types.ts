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
export type SingleSloCustomInput = EmbeddableSloProps & {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  showAllGroupByInstances?: boolean;
};

export type GroupSloCustomInput = EmbeddableSloProps & {
  groupFilters: GroupFilters | undefined;
};

export interface EmbeddableSloProps {
  remoteName?: string;
  reloadSubject?: Subject<boolean>;
  overviewMode?: OverviewMode;
}

export type SloEmbeddableInput = EmbeddableInput &
  Partial<GroupSloCustomInput> &
  Partial<SingleSloCustomInput>;
export type SloOverviewEmbeddableState = SerializedTitles &
  Partial<GroupSloCustomInput> &
  Partial<SingleSloCustomInput>;

export type SloOverviewApi = DefaultEmbeddableApi<SloOverviewEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle &
  HasSloOverviewConfig;

export interface HasSloOverviewConfig {
  getSloGroupOverviewConfig: () => GroupSloCustomInput;
  updateSloGroupOverviewConfig: (next: GroupSloCustomInput) => void;
}

export const apiHasSloOverviewConfig = (api: unknown | null): api is HasSloOverviewConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloOverviewConfig).getSloGroupOverviewConfig === 'function' &&
      typeof (api as HasSloOverviewConfig).updateSloGroupOverviewConfig === 'function'
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
  embeddable: SloOverviewApi;
};
