/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';

import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { Ecs } from '../../../graphql/types';
import { TimelineModel } from '../../../timelines/store/timeline/model';
import { inputsModel } from '../../../common/store';

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
  status: Status;
  selectedStatus: Status;
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  onAlertStatusUpdateSuccess: (count: number, status: Status) => void;
  onAlertStatusUpdateFailure: (status: Status, error: Error) => void;
}

export interface SendAlertToTimelineActionProps {
  apolloClient?: ApolloClient<{}>;
  createTimeline: CreateTimeline;
  ecsData: Ecs;
  updateTimelineIsLoading: UpdateTimelineLoading;
}

export type UpdateTimelineLoading = ({ id, isLoading }: { id: string; isLoading: boolean }) => void;

export interface CreateTimelineProps {
  from: number;
  timeline: TimelineModel;
  to: number;
  ruleNote?: string;
}

export type CreateTimeline = ({ from, timeline, to }: CreateTimelineProps) => void;
