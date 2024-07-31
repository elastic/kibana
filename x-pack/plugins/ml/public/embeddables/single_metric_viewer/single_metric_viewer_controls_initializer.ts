/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import type { TitlesApi } from '@kbn/presentation-publishing/interfaces/titles/titles_api';
import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject } from 'rxjs';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type {
  SingleMetricViewerEmbeddableState,
  SingleMetricViewerEmbeddableUserInput,
} from '../types';

export type AnomalySwimLaneControlsState = Pick<
  SingleMetricViewerEmbeddableState,
  'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription'
>;

export type SingleMetricViewerControlsState = Pick<
  SingleMetricViewerEmbeddableState,
  'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription' | 'forecastId'
>;

export const initializeSingleMetricViewerControls = (
  rawState: SingleMetricViewerEmbeddableState,
  titlesApi: TitlesApi
) => {
  const functionDescription = new BehaviorSubject<string | undefined>(rawState.functionDescription);
  const jobIds = new BehaviorSubject<JobId[]>(rawState.jobIds);
  const selectedDetectorIndex = new BehaviorSubject<number>(rawState.selectedDetectorIndex ?? 0);
  const selectedEntities = new BehaviorSubject<Record<string, any> | undefined>(
    rawState.selectedEntities
  );
  const forecastId = new BehaviorSubject<string | undefined>(rawState.forecastId);

  const updateUserInput = (update: SingleMetricViewerEmbeddableUserInput) => {
    jobIds.next(update.jobIds);
    functionDescription.next(update.functionDescription);
    selectedDetectorIndex.next(update.selectedDetectorIndex);
    selectedEntities.next(update.selectedEntities);
    titlesApi.setPanelTitle(update.panelTitle);
  };

  const updateForecastId = (id: string | undefined) => {
    forecastId.next(id);
  };

  const serializeSingleMetricViewerState = (): SingleMetricViewerControlsState => {
    return {
      jobIds: jobIds.getValue(),
      forecastId: forecastId.getValue(),
      selectedDetectorIndex: selectedDetectorIndex.getValue(),
      selectedEntities: selectedEntities.getValue(),
      functionDescription: functionDescription?.getValue(),
    };
  };

  const singleMetricViewerComparators: StateComparators<SingleMetricViewerControlsState> = {
    jobIds: [jobIds, (ids) => jobIds.next(ids), fastIsEqual],
    forecastId: [forecastId, (id) => forecastId.next(id)],
    selectedDetectorIndex: [selectedDetectorIndex, (index) => selectedDetectorIndex.next(index)],
    selectedEntities: [selectedEntities, (items) => selectedEntities.next(items), fastIsEqual],
    functionDescription: [
      functionDescription,
      (description) => functionDescription.next(description),
    ],
  };

  return {
    singleMetricViewerControlsApi: {
      jobIds,
      forecastId,
      selectedDetectorIndex,
      selectedEntities,
      functionDescription,
      updateForecastId,
      updateUserInput,
    },
    serializeSingleMetricViewerState,
    singleMetricViewerComparators,
    onSingleMetricViewerDestroy: () => {
      forecastId.complete();
      jobIds.complete();
      selectedDetectorIndex.complete();
      selectedEntities.complete();
      functionDescription.complete();
    },
  };
};
