/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type {
  PublishesWritablePanelTitle,
  PublishingSubject,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';

import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import type {
  AnomalySwimlaneEmbeddableCustomInput,
  AnomalySwimlaneEmbeddableUserInput,
  MlEmbeddableBaseApi,
} from '../types';

export interface AnomalySwimLaneComponentApi {
  jobIds: PublishingSubject<JobId[]>;
  swimlaneType: PublishingSubject<SwimlaneType>;
  viewBy: PublishingSubject<string | undefined>;
  perPage: PublishingSubject<number | undefined>;
  fromPage: PublishingSubject<number>;
  interval: PublishingSubject<number | undefined>;
  setInterval: (interval: number | undefined) => void;
  updateUserInput: (input: AnomalySwimlaneEmbeddableUserInput) => void;
  updatePagination: (update: { perPage?: number; fromPage: number }) => void;
}

export type AnomalySwimLaneEmbeddableApi = MlEmbeddableBaseApi<AnomalySwimLaneEmbeddableState> &
  PublishesWritablePanelTitle &
  AnomalySwimLaneComponentApi;

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

/**
 * Persisted state for the Anomaly Swim Lane Embeddable.
 */
export interface AnomalySwimLaneEmbeddableState
  extends SerializedTitles,
    AnomalySwimlaneEmbeddableCustomInput {}
