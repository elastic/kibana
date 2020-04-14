/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableContext,
  EmbeddableVisTriggerContext,
  IEmbeddable,
} from '../../../../../../../src/plugins/embeddable/public';

export type PlaceContext = EmbeddableContext;
export type ActionContext<T extends IEmbeddable = IEmbeddable> = EmbeddableVisTriggerContext<T>;

export interface Config {
  dashboardId?: string;
  useCurrentFilters: boolean;
  useCurrentDateRange: boolean;
}
