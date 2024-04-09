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
  SingleMetricViewerComponentApi,
  SingleMetricViewerEmbeddableState,
  SingleMetricViewerEmbeddableUserInput,
} from '../types';

export type AnomalySwimLaneControlsState = Pick<
  SingleMetricViewerEmbeddableState,
  'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription'
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

  const updateUserInput = (update: SingleMetricViewerEmbeddableUserInput) => {
    jobIds.next(update.jobIds);
    functionDescription.next(update.functionDescription);
    selectedDetectorIndex.next(update.selectedDetectorIndex);
    selectedEntities.next(update.selectedEntities);
    titlesApi.setPanelTitle(update.panelTitle);
  };

  const serializeSingleMetricViewerState = (): AnomalySwimLaneControlsState => {
    return {
      jobIds: jobIds.value,
      selectedDetectorIndex: selectedDetectorIndex.value,
      selectedEntities: selectedEntities.value,
      functionDescription: functionDescription?.value,
    };
  };

  const singleMetricViewerComparators: StateComparators<AnomalySwimLaneControlsState> = {
    jobIds: [jobIds, jobIds.next, fastIsEqual],
    selectedDetectorIndex: [selectedDetectorIndex, selectedDetectorIndex.next],
    selectedEntities: [selectedEntities, selectedEntities.next, fastIsEqual],
    functionDescription: [functionDescription, functionDescription.next],
  };

  return {
    singleMetricViewerControlsApi: {
      jobIds,
      selectedDetectorIndex,
      selectedEntities,
      functionDescription,
      updateUserInput,
    } as unknown as SingleMetricViewerComponentApi,
    serializeSingleMetricViewerState,
    singleMetricViewerComparators,
    onSingleMetricViewerDestroy: () => {
      jobIds.complete();
      selectedDetectorIndex.complete();
      selectedEntities.complete();
      functionDescription.complete();
    },
  };
};
