/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HasType,
  PublishesWritablePanelTitle,
  PublishingSubject,
} from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import type { JobId } from '../../shared';
import type { AnomalySwimLaneEmbeddableType } from '../constants';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import type { AnomalySwimlaneEmbeddableUserInput, MlEmbeddableBaseApi } from '../types';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';

export interface AnomalySwimLaneComponentApi {
  jobIds: PublishingSubject<JobId[]>;
  swimlaneType: PublishingSubject<SwimlaneType>;
  viewBy: PublishingSubject<string>;
  perPage: PublishingSubject<number>;
  fromPage: PublishingSubject<number>;
  interval: PublishingSubject<number | undefined>;
  updateUserInput: (input: AnomalySwimlaneEmbeddableUserInput) => void;
}

export interface AnomalySwimLaneEmbeddableApi
  extends HasType<AnomalySwimLaneEmbeddableType>,
    PublishesWritablePanelTitle,
    MlEmbeddableBaseApi,
    AnomalySwimLaneComponentApi {}

export interface AnomalySwimLaneActionContext {
  embeddable: AnomalySwimLaneEmbeddableApi;
  data?: AppStateSelectedCells;
}

export function isSwimLaneEmbeddableContext(arg: unknown): arg is AnomalySwimLaneActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, ANOMALY_SWIMLANE_EMBEDDABLE_TYPE)
  );
}
