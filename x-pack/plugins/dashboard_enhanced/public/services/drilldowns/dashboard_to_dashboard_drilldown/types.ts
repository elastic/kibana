/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableVisTriggerContext,
  EmbeddableContext,
} from '../../../../../../../src/plugins/embeddable/public';
import { UiActionsCollectConfigProps } from '../../../../../../../src/plugins/ui_actions/public';

export type FactoryContext = EmbeddableContext;
export type ActionContext = EmbeddableVisTriggerContext;

export interface Config {
  dashboardId?: string;
  useCurrentDashboardFilters: boolean;
  useCurrentDashboardDataRange: boolean;
}

export type CollectConfigProps = UiActionsCollectConfigProps<Config>;
