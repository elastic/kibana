/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RangeSelectTriggerContext,
  ValueClickTriggerContext,
  EmbeddableContext,
} from '../../../../../../../src/plugins/embeddable/public';
import { UiActionsCollectConfigProps } from '../../../../../../../src/plugins/ui_actions/public';

export type PlaceContext = EmbeddableContext;
export type ActionContext = RangeSelectTriggerContext | ValueClickTriggerContext;

export interface Config {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
}

export type CollectConfigProps = UiActionsCollectConfigProps<Config>;
