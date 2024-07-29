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
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { Subject } from 'rxjs';
import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';

export interface EmbeddableProps {
  sloId: string;
  sloInstanceId: string;
  duration: string;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
}

interface BurnRateCustomInput {
  sloId: string;
  sloInstanceId: string;
  duration: string;
}

export type SloBurnRateEmbeddableState = SerializedTitles & BurnRateCustomInput;
export type ErrorBudgetApi = DefaultEmbeddableApi<SloBurnRateEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}
