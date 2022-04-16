/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useStatusBulkActionItems } from '@kbn/timelines-plugin/public';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
interface Props {
  alertStatus?: Status;
  closePopover: () => void;
  eventId: string;
  timelineId: string;
  indexName: string;
  refetch?: () => void;
}

export const useAlertsActions = ({
  alertStatus,
  closePopover,
  eventId,
  timelineId,
  indexName,
  refetch,
}: Props) => {
  const dispatch = useDispatch();
  const { hasIndexWrite } = useAlertsPrivileges();

  const onStatusUpdate = useCallback(() => {
    closePopover();
    if (refetch) {
      refetch();
    }
  }, [closePopover, refetch]);

  const setEventsLoading = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  const actionItems = useStatusBulkActionItems({
    eventIds: [eventId],
    currentStatus: alertStatus,
    indexName,
    setEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onStatusUpdate,
    onUpdateFailure: onStatusUpdate,
    timelineId,
  });

  return {
    actionItems: hasIndexWrite ? actionItems : [],
  };
};
