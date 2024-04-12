/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import type { TitlesApi } from '@kbn/presentation-publishing/interfaces/titles/titles_api';
import fastIsEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatest } from 'rxjs';
import type { AnomalySwimlaneEmbeddableUserInput } from '..';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import { SWIM_LANE_DEFAULT_PAGE_SIZE } from '../../application/explorer/explorer_constants';
import type { AnomalySwimLaneComponentApi, AnomalySwimLaneEmbeddableState } from './types';

export type AnomalySwimLaneControlsState = Pick<
  AnomalySwimLaneEmbeddableState,
  'jobIds' | 'swimlaneType' | 'viewBy' | 'perPage'
>;

export const initializeSwimLaneControls = (
  rawState: AnomalySwimLaneEmbeddableState,
  titlesApi: TitlesApi
) => {
  const jobIds = new BehaviorSubject<JobId[]>(rawState.jobIds);
  const swimlaneType = new BehaviorSubject<SwimlaneType>(rawState.swimlaneType);
  const viewBy = new BehaviorSubject<string | undefined>(rawState.viewBy);
  const fromPage = new BehaviorSubject<number>(1);
  const perPage = new BehaviorSubject<number | undefined>(
    rawState.perPage ?? SWIM_LANE_DEFAULT_PAGE_SIZE
  );

  const updateUserInput = (update: AnomalySwimlaneEmbeddableUserInput) => {
    jobIds.next(update.jobIds);
    swimlaneType.next(update.swimlaneType);
    viewBy.next(update.viewBy);
    titlesApi.setPanelTitle(update.panelTitle);
  };

  const updatePagination = (update: { perPage?: number; fromPage: number }) => {
    fromPage.next(update.fromPage);
    if (update.perPage) {
      perPage.next(update.perPage);
    }
  };

  const subscription = combineLatest([jobIds, swimlaneType, viewBy]).subscribe(() => {
    updatePagination({ fromPage: 1 });
  });

  const serializeSwimLaneState = (): AnomalySwimLaneControlsState => {
    return {
      jobIds: jobIds.value,
      swimlaneType: swimlaneType.value,
      viewBy: viewBy.value,
      perPage: perPage.value,
    };
  };

  const swimLaneComparators: StateComparators<AnomalySwimLaneControlsState> = {
    jobIds: [jobIds, jobIds.next, fastIsEqual],
    swimlaneType: [swimlaneType, swimlaneType.next],
    viewBy: [viewBy, viewBy.next],
    perPage: [perPage, perPage.next],
  };

  return {
    swimLaneControlsApi: {
      jobIds,
      swimlaneType,
      viewBy,
      fromPage,
      perPage,
      updateUserInput,
      updatePagination,
    } as unknown as AnomalySwimLaneComponentApi,
    serializeSwimLaneState,
    swimLaneComparators,
    onSwimLaneDestroy: () => {
      subscription.unsubscribe();

      jobIds.complete();
      swimlaneType.complete();
      viewBy.complete();
      fromPage.complete();
      perPage.complete();
    },
  };
};
