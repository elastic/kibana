import {
  ApplicationStart,
  type CoreStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PublishesPanelTitle,
  PublishesWritablePanelTitle,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { Subject } from 'rxjs';

export interface EmbeddableSloProps {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
  reloadSubject?: Subject<boolean>;
  onRenderComplete?: () => void;
}

interface ErrorBudgetCustomInput {
  sloId: string | undefined;
  sloInstanceId: string | undefined;
}

export type SloErrorBudgetEmbeddableState = SerializedTitles & ErrorBudgetCustomInput;
export type ErrorBudgetApi = DefaultEmbeddableApi<SloErrorBudgetEmbeddableState> &
  PublishesWritablePanelTitle &
  PublishesPanelTitle;

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}
