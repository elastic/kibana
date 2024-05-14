/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { AnomalyChartsEmbeddableCustomInput, MlEmbeddableBaseApi } from '../types';

export interface AnomalyChartsEmbeddableOverridableState
  extends Omit<AnomalyChartsEmbeddableCustomInput, 'panelTitle'> {
  selectedEntities: MlEntityField[] | undefined;
}

export interface AnomalyChartsComponentApi {
  jobIds$: Observable<JobId[]>;
  maxSeriesToPlot$: Observable<JobId[]>;
  severityThreshold$: Observable<JobId[]>;
  entityFields$: Observable<JobId[]>;
  updateUserInput: (state: AnomalyChartsEmbeddableOverridableState) => void;
  updateSeverityThreshold: (threshold) => void;
  updateEntityFields: (entityFields: MlEntityField[] | undefined) => void;
}

/**
 * Persisted state for the Anomaly Charts Embeddable.
 */
export interface AnomalyChartsEmbeddableState
  extends SerializedTitles,
    AnomalyChartsEmbeddableOverridableState {}

export type AnomalyChartsEmbeddableApi = MlEmbeddableBaseApi<AnomalyChartsEmbeddableState> &
  PublishesDataViews &
  PublishesUnifiedSearch &
  PublishesWritablePanelTitle &
  HasEditCapabilities &
  AnomalyChartsComponentApi;

export interface AnomalyChartsFieldSelectionApi {
  jobIds: PublishingSubject<JobId[]>;
  entityFields: PublishingSubject<MlEntityField[] | undefined>;
}

export interface AnomalyChartsEmbeddableApi
  extends MlEmbeddableBaseApi,
    AnomalyChartsFieldSelectionApi {}
