/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { BehaviorSubject } from 'rxjs';
import type {
  FieldStatsInitializerViewType,
  FieldStatsInitialState,
} from '../grid_embeddable/types';

export interface FieldStatsControlsApi {
  viewType$: BehaviorSubject<FieldStatsInitializerViewType>;
  dataViewId$: BehaviorSubject<string>;
  query$: BehaviorSubject<AggregateQuery>;
  updateUserInput: (update: Partial<FieldStatsInitialState>) => void;
}
