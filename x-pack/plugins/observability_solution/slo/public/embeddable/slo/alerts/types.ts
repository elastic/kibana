/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DefaultEmbeddableApi, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type {
  EmbeddableApiContext,
  PublishesPanelTitle,
  PublishesWritablePanelTitle,
  SerializedTitles,
} from '@kbn/presentation-publishing';

export interface SloItem {
  id: string;
  instanceId: string;
  name: string;
  groupBy: string;
}

export interface EmbeddableSloProps {
  slos: SloItem[];
  showAllGroupByInstances?: boolean;
}

export type SloAlertsEmbeddableInput = EmbeddableInput & EmbeddableSloProps;

export type SloAlertsEmbeddableState = SerializedTitles & EmbeddableSloProps;

export type SloAlertsApi = DefaultEmbeddableApi<SloAlertsEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle &
  HasSloAlertsConfig;

export interface HasSloAlertsConfig {
  getSloAlertsConfig: () => EmbeddableSloProps;
  updateSloAlertsConfig: (next: EmbeddableSloProps) => void;
}

export const apiHasSloAlertsConfig = (api: unknown | null): api is HasSloAlertsConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloAlertsConfig).getSloAlertsConfig === 'function' &&
      typeof (api as HasSloAlertsConfig).updateSloAlertsConfig === 'function'
  );
};

export type SloAlertsEmbeddableActionContext = EmbeddableApiContext & {
  embeddable: SloAlertsApi;
};
