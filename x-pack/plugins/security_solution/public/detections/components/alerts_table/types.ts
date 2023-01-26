/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStart } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import type { NoteResult } from '../../../../common/types/timeline/note';
import type { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import type { TimelineModel } from '../../../timelines/store/timeline/model';
import type { inputsModel } from '../../../common/store';

export interface SetEventsLoadingProps {
  eventIds: string[];
  isLoading: boolean;
}

export interface SetEventsDeletedProps {
  eventIds: string[];
  isDeleted: boolean;
}

export interface UpdateAlertsStatusProps {
  alertIds: string[];
  status: Status;
  selectedStatus: Status;
}

export type UpdateAlertsStatusCallback = (
  refetchQuery: inputsModel.Refetch,
  { alertIds, status, selectedStatus }: UpdateAlertsStatusProps
) => void;

export type UpdateAlertsStatus = ({
  alertIds,
  status,
  selectedStatus,
}: UpdateAlertsStatusProps) => void;

export interface UpdateAlertStatusActionProps {
  query?: string;
  alertIds: string[];
  selectedStatus: Status;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  onAlertStatusUpdateSuccess: (updated: number, conflicts: number, status: Status) => void;
  onAlertStatusUpdateFailure: (status: Status, error: Error) => void;
}

export interface SendAlertToTimelineActionProps {
  createTimeline: CreateTimeline;
  ecsData: Ecs | Ecs[];
  updateTimelineIsLoading: UpdateTimelineLoading;
  searchStrategyClient: ISearchStart;
  getExceptionFilter: GetExceptionFilter;
}

export type UpdateTimelineLoading = ({ id, isLoading }: { id: string; isLoading: boolean }) => void;

export interface CreateTimelineProps {
  from: string;
  timeline: TimelineModel;
  to: string;
  notes: NoteResult[] | null;
  ruleNote?: string;
  ruleAuthor?: string | string[];
}

export type CreateTimeline = ({ from, timeline, to }: CreateTimelineProps) => void;
export type GetExceptionFilter = (ecsData: Ecs) => Promise<Filter | undefined>;

export interface ThresholdAggregationData {
  thresholdFrom: string;
  thresholdTo: string;
  dataProviders: DataProvider[];
}
