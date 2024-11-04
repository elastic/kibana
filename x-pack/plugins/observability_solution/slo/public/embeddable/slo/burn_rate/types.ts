/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ApplicationStart,
  IUiSettingsClient,
  NotificationsStart,
  type CoreStart,
} from '@kbn/core/public';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  PublishesPanelTitle,
  PublishesWritablePanelTitle,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { Subject } from 'rxjs';

export interface EmbeddableProps {
  sloId: string;
  sloInstanceId: string;
  duration: string;
  reloadSubject?: Subject<boolean>;
}

interface BurnRateCustomInput {
  sloId: string;
  sloInstanceId: string;
  duration: string;
}

export type SloBurnRateEmbeddableState = SerializedTitles & BurnRateCustomInput;
export type BurnRateApi = DefaultEmbeddableApi<SloBurnRateEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}
