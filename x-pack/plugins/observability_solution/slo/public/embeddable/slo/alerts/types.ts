/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';

export interface SloItem {
  id: string;
  instanceId: string;
  name: string;
  groupBy: string;
}

export interface EmbeddableSloProps {
  slos: SloItem[];
  timeRange?: TimeRange;
  lastReloadRequestTime?: number | undefined;
  showAllGroupByInstances?: boolean;
}

export type SloAlertsEmbeddableInput = EmbeddableInput & EmbeddableSloProps;

export interface HasSloAlertsConfig {
  getSloAlertsConfig: () => SloAlertsEmbeddableInput;
  updateSloAlertsConfig: (next: SloAlertsEmbeddableInput) => void;
}

export const apiHasSloAlertsConfig = (api: unknown | null): api is HasSloAlertsConfig => {
  return Boolean(
    api &&
      typeof (api as HasSloAlertsConfig).getSloAlertsConfig === 'function' &&
      typeof (api as HasSloAlertsConfig).updateSloAlertsConfig === 'function'
  );
};
